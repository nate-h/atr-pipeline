from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.models.dataset import Dataset


def init_db(session: Session) -> None:
    settings = get_settings()
    Base.metadata.create_all(bind=engine)

    existing = session.scalar(select(Dataset).where(Dataset.name == settings.dataset_name))
    if existing is not None:
        return

    session.add(
        Dataset(
            name=settings.dataset_name,
            root_path=str(settings.dataset_root),
            yaml_path=str(settings.dataset_yaml_path),
        )
    )
    session.commit()
