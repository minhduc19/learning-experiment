import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from app.auth.dependencies import current_user
from app.auth.security import (
    COOKIE,
    DUMMY_HASH,
    access_token,
    budget,
    digest,
    hash_password,
    public_user,
    secure_cookie,
    verify_password,
)
from app.corpus.database import connect

router = APIRouter()


class Signup(BaseModel):
    email: EmailStr = Field(max_length=320)
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=10, max_length=256)


class Login(BaseModel):
    email: EmailStr = Field(max_length=320)
    password: str = Field(min_length=1, max_length=256)


def origin_check(request):
    # Refresh/logout authenticate by cookie, so reject cross-origin browser writes.
    origin = request.headers.get("origin")
    if request.headers.get("sec-fetch-site") == "cross-site":
        raise HTTPException(403, "Cross-origin request rejected")
    expected = os.getenv("AUTH_PUBLIC_ORIGIN") or str(request.base_url).rstrip("/")
    if origin and origin != expected:
        raise HTTPException(403, "Cross-origin request rejected")


def set_refresh(response, token):
    response.set_cookie(
        COOKIE,
        token,
        max_age=30 * 86400,
        httponly=True,
        secure=secure_cookie(),
        samesite="lax",
        path="/api/auth",
    )
    response.headers["Cache-Control"] = "no-store"


@router.post("/register", status_code=201)
def register(data: Signup, request: Request):
    origin_check(request)
    budget("register:" + str(request.client.host), 60)
    password_hash = hash_password(data.password)
    try:
        with connect() as db:
            row = db.execute(
                """INSERT INTO auth.users(id,email,username,password_hash) VALUES (%s,%s,%s,%s)
                RETURNING id,email,username,role,created_at""",
                (uuid4(), str(data.email).lower(), data.username, password_hash),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "Email or username is already registered") from None
    return public_user(row)


@router.post("/login")
def login(data: Login, request: Request, response: Response):
    origin_check(request)
    budget("login-ip:" + str(request.client.host), 300)
    budget(
        "login-email:" + str(request.client.host) + ":" + str(data.email).lower(), 10
    )
    with connect() as db:
        user = db.execute(
            "SELECT * FROM auth.users WHERE lower(email)=lower(%s)", (str(data.email),)
        ).fetchone()
        valid = verify_password(
            data.password, user["password_hash"] if user else DUMMY_HASH
        )
        if not user or not valid or not user["is_active"]:
            raise HTTPException(401, "Email or password is incorrect")
        sid, refresh = uuid4(), secrets.token_urlsafe(48)
        db.execute(
            "INSERT INTO auth.sessions(id,user_id,refresh_token_hash,expires_at) VALUES (%s,%s,%s,%s)",
            (
                sid,
                user["id"],
                digest(refresh),
                datetime.now(timezone.utc) + timedelta(days=30),
            ),
        )
        token = access_token(db, user["id"], sid)
    set_refresh(response, refresh)
    return {"access_token": token, "user": public_user(user)}


@router.post("/refresh")
def refresh(request: Request, response: Response):
    origin_check(request)
    old = request.cookies.get(COOKIE)
    if not old:
        raise HTTPException(401, "Please log in")
    with connect() as db:
        session = db.execute(
            """SELECT s.* FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id
            WHERE refresh_token_hash=%s AND revoked_at IS NULL AND expires_at>now() AND u.is_active FOR UPDATE OF s""",
            (digest(old),),
        ).fetchone()
        if not session:
            raise HTTPException(401, "Please log in")
        new = secrets.token_urlsafe(48)
        db.execute(
            "UPDATE auth.sessions SET refresh_token_hash=%s,refreshed_at=now() WHERE id=%s",
            (digest(new), session["id"]),
        )
        user = db.execute(
            "SELECT * FROM auth.users WHERE id=%s", (session["user_id"],)
        ).fetchone()
        token = access_token(db, user["id"], session["id"])
    set_refresh(response, new)
    return {"access_token": token, "user": public_user(user)}


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response):
    origin_check(request)
    cookie = request.cookies.get(COOKIE)
    authorization = request.headers.get("authorization", "")
    from app.auth.dependencies import authenticate

    user = None
    if authorization.lower().startswith("bearer "):
        try:
            user = authenticate(authorization[7:])
        except HTTPException:
            pass
    with connect() as db:
        if cookie:
            db.execute(
                "UPDATE auth.sessions SET revoked_at=now() WHERE refresh_token_hash=%s",
                (digest(cookie),),
            )
        if user:
            db.execute(
                "UPDATE auth.sessions SET revoked_at=now() WHERE id=%s AND user_id=%s",
                (user["_session_id"], user["id"]),
            )
    response.delete_cookie(
        COOKIE, path="/api/auth", secure=secure_cookie(), httponly=True, samesite="lax"
    )
    response.headers["Cache-Control"] = "no-store"


@router.get("/me")
def me(response: Response, user=Depends(current_user)):
    response.headers["Cache-Control"] = "no-store"
    return public_user(user)
