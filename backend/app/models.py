from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    runs: Mapped[list["SavedRun"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class SavedRun(Base):
    """A strategy simulation a user chose to keep. Totals are computed by the
    server at save time, never accepted from the client."""

    __tablename__ = "saved_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    session_id: Mapped[str] = mapped_column(String(40))
    driver: Mapped[str] = mapped_column(String(3))
    team: Mapped[str] = mapped_column(String(40))
    plan: Mapped[list] = mapped_column(JSON)
    rival_plan: Mapped[list | None] = mapped_column(JSON, nullable=True)
    pit_loss_s: Mapped[float] = mapped_column(Float)
    total_time_s: Mapped[float] = mapped_column(Float)
    rival_total_time_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    final_delta_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    user: Mapped[User] = relationship(back_populates="runs")
