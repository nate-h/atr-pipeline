from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dataset import DatasetSummaryResponse, DatasetValidationResponse
from app.services.dataset_service import get_dataset_summary, validate_dataset

router = APIRouter()


@router.get("/summary", response_model=DatasetSummaryResponse)
def dataset_summary(db: Session = Depends(get_db)) -> DatasetSummaryResponse:
    return get_dataset_summary(db)


@router.get("/validate", response_model=DatasetValidationResponse)
def dataset_validate(db: Session = Depends(get_db)) -> DatasetValidationResponse:
    return validate_dataset(db)
