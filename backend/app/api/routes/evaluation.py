from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.schemas.evaluation import EvaluationRunDetail, EvaluationRunSummary
from app.services.evaluation_service import (
    create_evaluation_run,
    get_evaluation_run,
    list_evaluation_runs,
    serialize_evaluation_detail,
    serialize_evaluation_run,
)
from app.services.training_service import get_training_run_by_id

router = APIRouter()


@router.post(
    "/runs/{training_run_id}",
    response_model=EvaluationRunSummary,
    status_code=status.HTTP_202_ACCEPTED,
)
def start_evaluation_run(
    training_run_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> EvaluationRunSummary:
    settings = get_settings()
    try:
        training_run = get_training_run_by_id(db, training_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    evaluation_run = create_evaluation_run(db, training_run, settings)
    request.app.state.job_manager.submit_evaluation(evaluation_run.id)
    return serialize_evaluation_run(evaluation_run)


@router.get("/runs", response_model=list[EvaluationRunSummary])
def evaluation_runs(db: Session = Depends(get_db)) -> list[EvaluationRunSummary]:
    return list_evaluation_runs(db)


@router.get("/runs/{evaluation_run_id}", response_model=EvaluationRunDetail)
def evaluation_run_detail(
    evaluation_run_id: UUID,
    db: Session = Depends(get_db),
) -> EvaluationRunDetail:
    try:
        run = get_evaluation_run(db, evaluation_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return serialize_evaluation_detail(run)
