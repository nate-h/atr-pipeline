from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.annotation import (
    AnnotationImageDetailResponse,
    AnnotationImageListResponse,
    AnnotationInfoResponse,
    AnnotationSaveRequest,
    AnnotationSaveResponse,
    AnnotationSyncResponse,
)
from app.services.annotation_service import (
    get_annotation_image_detail,
    get_annotation_info,
    list_annotation_images,
    save_annotation_boxes,
    sync_yolo_archive,
)

router = APIRouter()


@router.get("/info", response_model=AnnotationInfoResponse)
def annotation_info() -> AnnotationInfoResponse:
    return get_annotation_info()


@router.get("/images", response_model=AnnotationImageListResponse)
def annotation_images(
    split: Literal["train", "valid", "test"],
) -> AnnotationImageListResponse:
    return list_annotation_images(split)


@router.get("/images/{split}/{image_name}", response_model=AnnotationImageDetailResponse)
def annotation_image_detail(
    split: Literal["train", "valid", "test"],
    image_name: str,
) -> AnnotationImageDetailResponse:
    try:
        return get_annotation_image_detail(split, image_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/images/{split}/{image_name}", response_model=AnnotationSaveResponse)
def annotation_image_save(
    split: Literal["train", "valid", "test"],
    image_name: str,
    payload: AnnotationSaveRequest,
) -> AnnotationSaveResponse:
    try:
        return save_annotation_boxes(split, image_name, payload.boxes)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/sync", response_model=AnnotationSyncResponse)
def annotation_sync(
    split: Literal["train", "valid", "test"] = Form(...),
    archive: UploadFile = File(...),
) -> AnnotationSyncResponse:
    return sync_yolo_archive(split=split, archive=archive)
