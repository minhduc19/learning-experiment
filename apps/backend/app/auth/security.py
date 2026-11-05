import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from threading import BoundedSemaphore

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

from app.corpus.database import connect

hasher = PasswordHasher()
password_slots = BoundedSemaphore(2)
DUMMY_HASH = hasher.hash(secrets.token_urlsafe(32))
COOKIE = "corpus_refresh"


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def signing_key(db):
    configured = os.getenv("AUTH_JWT_SECRET")
    if configured:
        if len(configured) < 32:
            raise RuntimeError("AUTH_JWT_SECRET must contain at least 32 characters")
        return configured
    db.execute(
        "INSERT INTO auth.settings(name,value) VALUES ('jwt_key',%s) ON CONFLICT DO NOTHING",
        (secrets.token_urlsafe(48),),
    )
    return db.execute(
        "SELECT value FROM auth.settings WHERE name='jwt_key'"
    ).fetchone()["value"]


def access_token(db, user_id, session_id):
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "iat": now,
            "exp": now + timedelta(minutes=15),
            "iss": "learning-experiment",
            "aud": "corpus",
            "type": "access",
        },
        signing_key(db),
        algorithm="HS256",
    )


def public_user(row):
    return {key: row[key] for key in ("id", "email", "username", "role", "created_at")}


def verify_password(password, encoded):
    try:
        with password_slots:
            return hasher.verify(encoded, password)
    except VerificationError:
        return False


def secure_cookie():
    return os.getenv("AUTH_COOKIE_SECURE", "true").lower() == "true"


def hash_password(password):
    with password_slots:
        return hasher.hash(password)


def budget(key, limit):
    from fastapi import HTTPException

    with connect() as db:
        row = db.execute(
            """INSERT INTO auth.login_throttles(key,attempts) VALUES (%s,1)
            ON CONFLICT(key) DO UPDATE SET
            attempts=CASE WHEN auth.login_throttles.started_at<now()-interval '5 minutes' THEN 1 ELSE auth.login_throttles.attempts+1 END,
            started_at=CASE WHEN auth.login_throttles.started_at<now()-interval '5 minutes' THEN now() ELSE auth.login_throttles.started_at END
            RETURNING attempts""",
            (digest(key),),
        ).fetchone()
    if row["attempts"] > limit:
        raise HTTPException(
            429,
            "Too many attempts. Please try again in five minutes.",
            headers={"Retry-After": "300"},
        )
