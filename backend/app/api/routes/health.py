from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import SessionLocal

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str | bool]:
    settings = get_settings()
    database_ok = True
    with SessionLocal() as session:
        try:
            session.execute(text("SELECT 1"))
        except Exception:
            database_ok = False

    return {
        "status": "ok" if database_ok else "degraded",
        "database_ok": database_ok,
        "dataset_found": Path(settings.dataset_root).exists(),
    }
