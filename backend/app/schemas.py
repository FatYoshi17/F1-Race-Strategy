from pydantic import BaseModel, Field, model_validator

from .config import DEFAULT_PIT_LOSS_S, VALID_COMPOUNDS

MAX_STINTS = 6
MAX_TOTAL_LAPS = 80


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
    session_id: str = Field(max_length=40)
    driver: str = Field(max_length=3)
    plan: list[StintPlan] = Field(min_length=1, max_length=MAX_STINTS)
    rival_plan: list[StintPlan] | None = Field(default=None, max_length=MAX_STINTS)
    pit_loss_s: float = Field(default=DEFAULT_PIT_LOSS_S, ge=0, le=60)

    @model_validator(mode="after")
    def _bounded_race_length(self):
        # Each lap is one TFT forward pass; cap the work a single request can ask for.
        for plan in (self.plan, self.rival_plan or []):
            if sum(s.laps for s in plan) > MAX_TOTAL_LAPS:
                raise ValueError(f"A plan can't exceed {MAX_TOTAL_LAPS} total laps")
        return self
