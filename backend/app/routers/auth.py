import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..security import (
    DUMMY_HASH,
    check_login_allowed,
    clear_login_failures,
    create_access_token,
    get_current_user,
    hash_password,
    record_login_failure,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v


class UserOut(BaseModel):
    id: int
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(user),
        user=UserOut(id=user.id, email=user.email),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: Credentials, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status_code=409, detail="That email is already registered")
    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # lost a race with a concurrent registration
        db.rollback()
        raise HTTPException(status_code=409, detail="That email is already registered")
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(body: Credentials, db: Session = Depends(get_db)):
    check_login_allowed(body.email)
    user = db.scalar(select(User).where(User.email == body.email))
    # Always run one scrypt verification so unknown-email and wrong-password
    # responses are indistinguishable (same message, same timing).
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not ok:
        record_login_failure(body.email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    clear_login_failures(body.email)
    return _auth_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email)
