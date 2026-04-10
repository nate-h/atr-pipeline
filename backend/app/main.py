from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.tasks.job_manager import JobManager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    settings.artifacts_root.mkdir(parents=True, exist_ok=True)
    with SessionLocal() as session:
        init_db(session)
    app.state.job_manager = JobManager(settings)
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)
app.mount(
    "/artifacts", StaticFiles(directory=settings.artifacts_root, check_dir=False), name="artifacts"
)
app.mount(
    "/dataset-files",
    StaticFiles(directory=settings.dataset_root, check_dir=False),
    name="dataset-files",
)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "ATR Ship Workbench backend is running."}
