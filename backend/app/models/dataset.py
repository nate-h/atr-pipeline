from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def utc_now() -> datetime:
    return datetime.now(UTC)


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    root_path: Mapped[str] = mapped_column(Text, nullable=False)
    yaml_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    training_runs = relationship(
        "TrainingRun",
        back_populates="dataset",
        cascade="all, delete-orphan",
        order_by="desc(TrainingRun.created_at)",
    )
