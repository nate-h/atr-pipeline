from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.training import TrainingRunCreate, TrainingRunDetail, TrainingRunSummary
from app.services.training_service import (
    create_training_run,
    get_training_run_by_id,
    list_training_runs,
    serialize_training_run,
    serialize_training_run_detail,
)

router = APIRouter()


@router.post("/runs", response_model=TrainingRunSummary, status_code=status.HTTP_202_ACCEPTED)
def start_training_run(
    payload: TrainingRunCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> TrainingRunSummary:
    settings = get_settings()
    run = create_training_run(db, payload, settings)
    request.app.state.job_manager.submit_training(run.id)
    db.refresh(run)
    return serialize_training_run(run, settings)


@router.get("/runs", response_model=list[TrainingRunSummary])
def training_runs(db: Session = Depends(get_db)) -> list[TrainingRunSummary]:
    return list_training_runs(db, get_settings())


@router.get("/runs/{run_id}", response_model=TrainingRunDetail)
def training_run_detail(run_id: UUID, db: Session = Depends(get_db)) -> TrainingRunDetail:
    settings = get_settings()
    try:
        run = get_training_run_by_id(db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return serialize_training_run_detail(run, settings)
