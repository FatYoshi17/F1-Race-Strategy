from pydantic import BaseModel, Field

from .config import DEFAULT_PIT_LOSS_S, VALID_COMPOUNDS


class SessionInfo(BaseModel):
    id: str
    year: int
    event: str
    session: str
    label: str


class DriverInfo(BaseModel):
    driver: str
    team: str


class StintPlan(BaseModel):
    compound: str = Field(..., description=f"One of {VALID_COMPOUNDS}")
    laps: int = Field(..., ge=1, le=60)


class SimulateRequest(BaseModel):
    session_id: str
    driver: str
    plan: list[StintPlan]
    rival_plan: list[StintPlan] | None = None
    pit_loss_s: float = DEFAULT_PIT_LOSS_S
