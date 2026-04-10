from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import RunBase


class TrainingRunCreate(BaseModel):
    model_name: str = Field(default="yolov8n.pt")
    epochs: int = Field(default=5, ge=1, le=500)
    batch_size: int = Field(default=8, ge=1, le=256)
    image_size: int = Field(default=640, ge=64, le=2048)


class TrainingRunSummary(RunBase):
    dataset_id: int
    model_name: str
    epochs: int
    batch_size: int
    image_size: int
    artifact_path: str
    artifact_url: str | None
    metrics_json: dict[str, Any] | None
    mlflow_run_id: str | None
    mlflow_url: str | None


class TrainingRunDetail(TrainingRunSummary):
    logs: str
    evaluations: list[dict[str, Any]]


class DashboardRunSummary(BaseModel):
    id: UUID
    status: str
    model_name: str
    started_at: datetime | None
    completed_at: datetime | None
    metrics_json: dict[str, Any] | None
