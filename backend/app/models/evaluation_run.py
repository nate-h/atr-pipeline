from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.dataset import utc_now


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    training_run_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("training_runs.id", ondelete="CASCADE")
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outputs_path: Mapped[str] = mapped_column(Text, nullable=False)
    logs_path: Mapped[str] = mapped_column(Text, nullable=False)
    metrics_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    training_run = relationship("TrainingRun", back_populates="evaluation_runs")
