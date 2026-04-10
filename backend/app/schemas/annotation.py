from __future__ import annotations

from pydantic import BaseModel


class AnnotationInfoResponse(BaseModel):
    mode: str
    dataset_root: str
    classes: list[str]
    instructions: list[str]
    sync_support: bool = True


class AnnotationSyncResponse(BaseModel):
    split: str
    synced_count: int
    destination: str
    skipped_files: list[str]


class AnnotationBox(BaseModel):
    class_id: int
    x_center: float
    y_center: float
    width: float
    height: float


class AnnotationImageSummary(BaseModel):
    image_name: str
    image_url: str
    has_annotations: bool
    box_count: int


class AnnotationImageListResponse(BaseModel):
    split: str
    images: list[AnnotationImageSummary]


class AnnotationImageDetailResponse(BaseModel):
    split: str
    image_name: str
    image_url: str
    label_path: str
    classes: list[str]
    boxes: list[AnnotationBox]


class AnnotationSaveRequest(BaseModel):
    boxes: list[AnnotationBox]


class AnnotationSaveResponse(BaseModel):
    split: str
    image_name: str
    label_path: str
    saved_count: int
