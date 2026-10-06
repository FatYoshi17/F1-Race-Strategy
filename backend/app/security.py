"""Password hashing, JWT issuing/verification, login throttling.

Passwords: scrypt from the standard library (memory-hard, no extra dependency).
Tokens: short-lived HS256 JWTs carried in the Authorization header.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import secrets
import time
from collections import defaultdict, deque

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

log = logging.getLogger("pitwall.security")

# ---------------------------------------------------------------- passwords
_SCRYPT_N, _SCRYPT_R, _SCRYPT_P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(
        password.encode(), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=32
    )
    return "scrypt${}${}${}${}${}".format(
        _SCRYPT_N, _SCRYPT_R, _SCRYPT_P,
        base64.b64encode(salt).decode(), base64.b64encode(digest).decode(),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        _, n, r, p, salt_b64, digest_b64 = stored.split("$")
        expected = base64.b64decode(digest_b64)
        actual = hashlib.scrypt(
            password.encode(), salt=base64.b64decode(salt_b64),
            n=int(n), r=int(r), p=int(p), dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


# Verified against when the email doesn't exist, so "unknown user" and "wrong
# password" take the same time and can't be told apart by timing.
DUMMY_HASH = hash_password("not-a-real-password")

# ------------------------------------------------------------------- tokens
TOKEN_TTL_SECONDS = 24 * 3600
_ALGORITHM = "HS256"

_secret = os.environ.get("JWT_SECRET")
if not _secret:
    # Never ship a hard-coded default secret. Without one configured, tokens
    # are valid only until the process restarts.
    _secret = secrets.token_urlsafe(48)
    log.warning("JWT_SECRET not set; using a random per-process secret")
JWT_SECRET = _secret


def create_access_token(user: User) -> str:
    now = int(time.time())
    return jwt.encode(
        {"sub": str(user.id), "iat": now, "exp": now + TOKEN_TTL_SECONDS},
        JWT_SECRET,
        algorithm=_ALGORITHM,
    )


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        # Pin the algorithm: never trust the token's own header to choose it.
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[_ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


# ---------------------------------------------------------- login throttling
# In-memory sliding window: fine for one process, resets on restart. A
# multi-instance deployment would move this to Redis.
_MAX_FAILURES = 5
_WINDOW_SECONDS = 15 * 60
_failures: dict[str, deque[float]] = defaultdict(deque)


def _prune(key: str) -> deque[float]:
    q = _failures[key]
    cutoff = time.time() - _WINDOW_SECONDS
    while q and q[0] < cutoff:
        q.popleft()
    return q


def check_login_allowed(key: str) -> None:
    if len(_prune(key)) >= _MAX_FAILURES:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Try again in a few minutes.",
        )


def record_login_failure(key: str) -> None:
    _prune(key).append(time.time())


def clear_login_failures(key: str) -> None:
    _failures.pop(key, None)
