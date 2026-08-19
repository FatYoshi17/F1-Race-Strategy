import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import sessions, strategy, tft_model
from .config import SESSION_REGISTRY, VALID_COMPOUNDS
from .rollout import PlanTooShortError
from .schemas import SimulateRequest

app = FastAPI(title="F1 Pit Wall API")

_default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_extra_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _warm_up_model() -> None:
    tft_model.load_model()


@app.get("/api/health")
def health():
    return {"status": "ok", "device": tft_model.device()}


@app.get("/api/sessions")
def list_sessions():
    return SESSION_REGISTRY


@app.get("/api/sessions/{session_id}/drivers")
def list_drivers(session_id: str):
    try:
        return sessions.get_drivers(session_id)
    except sessions.SessionNotFoundError:
        raise HTTPException(status_code=404, detail=f"Unknown session '{session_id}'")


@app.get("/api/sessions/{session_id}/drivers/{driver}/laps")
def driver_laps(session_id: str, driver: str):
    try:
        df = sessions.get_driver_laps(session_id, driver.upper())
    except sessions.SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return df.to_dict(orient="records")


@app.post("/api/strategy/simulate")
def simulate_strategy(req: SimulateRequest):
    for stint in req.plan:
        if stint.compound not in VALID_COMPOUNDS:
            raise HTTPException(status_code=400, detail=f"Invalid compound '{stint.compound}'")
    if req.rival_plan:
        for stint in req.rival_plan:
            if stint.compound not in VALID_COMPOUNDS:
                raise HTTPException(status_code=400, detail=f"Invalid compound '{stint.compound}'")

    try:
        return strategy.compare(
            session_id=req.session_id,
            driver=req.driver.upper(),
            plan=[s.model_dump() for s in req.plan],
            rival_plan=[s.model_dump() for s in req.rival_plan] if req.rival_plan else None,
            pit_loss_s=req.pit_loss_s,
        )
    except sessions.SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PlanTooShortError as e:
        raise HTTPException(status_code=400, detail=str(e))
