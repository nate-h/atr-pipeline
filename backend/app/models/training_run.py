from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.dataset import utc_now


class TrainingRun(Base):
    __tablename__ = "training_runs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    dataset_id: Mapped[int] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"))
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    epochs: Mapped[int] = mapped_column(Integer, nullable=False)
    batch_size: Mapped[int] = mapped_column(Integer, nullable=False)
    image_size: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="queued")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    artifact_path: Mapped[str] = mapped_column(Text, nullable=False)
    logs_path: Mapped[str] = mapped_column(Text, nullable=False)
    metrics_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    mlflow_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    dataset = relationship("Dataset", back_populates="training_runs")
    evaluation_runs = relationship(
        "EvaluationRun",
        back_populates="training_run",
        cascade="all, delete-orphan",
        order_by="desc(EvaluationRun.created_at)",
    )
