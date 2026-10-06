"""Database engine/session setup.

DATABASE_URL decides the backend: SQLite file by default (zero-setup local dev),
Postgres in production. Hosted providers hand out `postgres://` / `postgresql://`
URLs; SQLAlchemy needs the driver spelled out, so we normalise here.
"""
from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL", "sqlite:///./pitwall.db")
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _database_url()
_is_sqlite = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    # SQLite connections are bound to a thread by default; FastAPI runs sync
    # endpoints in a threadpool. pool_pre_ping drops connections a managed
    # Postgres has silently closed while the free instance was idle.
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from . import models  # noqa: F401  (register tables on Base.metadata)

    Base.metadata.create_all(bind=engine)
