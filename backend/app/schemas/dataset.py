from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class SplitSummary(BaseModel):
    name: str
    image_count: int
    label_count: int
    empty_label_count: int
    missing_label_count: int
    orphan_label_count: int
    sample_images: list[str]


class DatasetSummaryResponse(BaseModel):
    id: int
    name: str
    root_path: str
    yaml_path: str
    parsed_yaml: dict[str, Any]
    normalized_yaml: dict[str, Any]
    classes: list[str]
    splits: list[SplitSummary]
    last_training_run: dict[str, Any] | None


class SplitValidation(BaseModel):
    name: str
    missing_label_files: list[str]
    orphan_label_files: list[str]
    empty_label_files: list[str]
    sample_images: list[str]


class DatasetValidationResponse(BaseModel):
    dataset_id: int
    dataset_name: str
    classes: list[str]
    warnings: list[str]
    splits: list[SplitValidation]
