from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import annotation, dataset, evaluation, health, training

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(dataset.router, prefix="/dataset", tags=["dataset"])
api_router.include_router(annotation.router, prefix="/annotation", tags=["annotation"])
api_router.include_router(training.router, prefix="/training", tags=["training"])
api_router.include_router(evaluation.router, prefix="/evaluation", tags=["evaluation"])
