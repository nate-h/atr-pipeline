from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.dataset import (
    DatasetImageImportResponse,
    DatasetSummaryResponse,
    DatasetValidationResponse,
)
from app.services.dataset_service import (
    get_dataset_summary,
    import_dataset_images,
    validate_dataset,
)

router = APIRouter()


@router.get("/summary", response_model=DatasetSummaryResponse)
def dataset_summary(db: Session = Depends(get_db)) -> DatasetSummaryResponse:
    return get_dataset_summary(db)


@router.get("/validate", response_model=DatasetValidationResponse)
def dataset_validate(db: Session = Depends(get_db)) -> DatasetValidationResponse:
    return validate_dataset(db)


@router.post("/import-images", response_model=DatasetImageImportResponse)
def dataset_import_images(
    files: Annotated[list[UploadFile] | None, File()] = None,
    archive: Annotated[UploadFile | None, File()] = None,
) -> DatasetImageImportResponse:
    try:
        return import_dataset_images(files=files or [], archive=archive)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
