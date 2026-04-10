from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RunMetrics(BaseModel):
    precision: float | None = None
    recall: float | None = None
    map50: float | None = None
    map50_95: float | None = None
    raw: dict[str, Any] | None = None


class RunBase(ORMBaseModel):
    id: UUID
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
