from contextvars import ContextVar
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.concurrency import run_in_threadpool

from app.auth.security import signing_key
from app.corpus.database import connect

bearer = HTTPBearer(auto_error=False)
identity = ContextVar("corpus_user", default=None)


def user_id():
    value = identity.get()
    if value is None:
        raise HTTPException(
            401, "Please log in", headers={"WWW-Authenticate": "Bearer"}
        )
    return value


def authenticate(token):
    try:
        with connect() as db:
            data = jwt.decode(
                token,
                signing_key(db),
                algorithms=["HS256"],
                audience="corpus",
                issuer="learning-experiment",
                options={"require": ["sub", "sid", "exp", "iat", "type"]},
            )
            if data["type"] != "access":
                raise ValueError()
            row = db.execute(
                """SELECT u.* FROM auth.users u JOIN auth.sessions s ON s.user_id=u.id
                WHERE u.id=%s AND s.id=%s AND u.is_active AND s.revoked_at IS NULL AND s.expires_at>now()""",
                (UUID(data["sub"]), UUID(data["sid"])),
            ).fetchone()
            if row is None:
                raise ValueError()
            row["_session_id"] = UUID(data["sid"])
            return row
    except (jwt.PyJWTError, ValueError, TypeError, KeyError):
        raise HTTPException(
            401, "Please log in", headers={"WWW-Authenticate": "Bearer"}
        ) from None


async def current_user(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
):
    if not credentials:
        raise HTTPException(
            401, "Please log in", headers={"WWW-Authenticate": "Bearer"}
        )
    user = await run_in_threadpool(authenticate, credentials.credentials)
    marker = identity.set(user["id"])
    try:
        yield user
    finally:
        identity.reset(marker)
