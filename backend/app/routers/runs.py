from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import sessions, strategy
from ..config import VALID_COMPOUNDS
from ..db import get_db
from ..models import SavedRun, User
from ..rollout import PlanTooShortError
from ..schemas import SimulateRequest
from ..security import get_current_user

router = APIRouter(prefix="/api/runs", tags=["runs"])

MAX_RUNS_PER_USER = 50


class SaveRunRequest(SimulateRequest):
    name: str = Field(default="", max_length=60)


def _serialize(run: SavedRun) -> dict:
    return {
        "id": run.id,
        "name": run.name,
        "session_id": run.session_id,
        "driver": run.driver,
        "team": run.team,
        "plan": run.plan,
        "rival_plan": run.rival_plan,
        "pit_loss_s": run.pit_loss_s,
        "total_time_s": run.total_time_s,
        "rival_total_time_s": run.rival_total_time_s,
        "final_delta_s": run.final_delta_s,
        "created_at": run.created_at.isoformat(),
    }


@router.get("")
def list_runs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(SavedRun).where(SavedRun.user_id == user.id).order_by(SavedRun.id.desc())
    ).all()
    return [_serialize(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
def save_run(
    req: SaveRunRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.scalar(select(func.count()).select_from(SavedRun).where(SavedRun.user_id == user.id))
    if count >= MAX_RUNS_PER_USER:
        raise HTTPException(status_code=409, detail=f"Run limit reached ({MAX_RUNS_PER_USER}). Delete one first.")

    for stint in [*req.plan, *(req.rival_plan or [])]:
        if stint.compound not in VALID_COMPOUNDS:
            raise HTTPException(status_code=400, detail=f"Invalid compound '{stint.compound}'")

    plan = [s.model_dump() for s in req.plan]
    rival_plan = [s.model_dump() for s in req.rival_plan] if req.rival_plan else None
    driver = req.driver.upper()

    # Totals are recomputed here rather than trusted from the client.
    try:
        result = strategy.compare(
            session_id=req.session_id, driver=driver, plan=plan,
            rival_plan=rival_plan, pit_loss_s=req.pit_loss_s,
        )
    except sessions.SessionNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PlanTooShortError as e:
        raise HTTPException(status_code=400, detail=str(e))

    run = SavedRun(
        user_id=user.id,
        name=req.name.strip() or f"{driver} · {req.session_id}",
        session_id=req.session_id,
        driver=driver,
        team=result["primary"]["team"],
        plan=plan,
        rival_plan=rival_plan,
        pit_loss_s=req.pit_loss_s,
        total_time_s=result["primary"]["total_time_s"],
        rival_total_time_s=result["rival"]["total_time_s"] if result["rival"] else None,
        final_delta_s=result["delta"]["final_delta_s"] if result["delta"] else None,
    )
    db.add(run)
    db.commit()
    return _serialize(run)


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_run(run_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    run = db.get(SavedRun, run_id)
    # 404 (not 403) for someone else's run, so ids can't be probed for existence.
    if run is None or run.user_id != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete(run)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
