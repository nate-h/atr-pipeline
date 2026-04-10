from __future__ import annotations

import traceback
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session
from ultralytics import YOLO

from app.core.config import Settings
from app.models.evaluation_run import EvaluationRun
from app.models.training_run import TrainingRun
from app.schemas.evaluation import EvaluationRunDetail, EvaluationRunSummary
from app.services.dataset_service import materialize_training_yaml
from app.services.storage_service import (
    append_log,
    artifact_url,
    ensure_directory,
    list_image_urls,
    read_text_file,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def create_evaluation_run(
    session: Session, training_run: TrainingRun, settings: Settings
) -> EvaluationRun:
    evaluation = EvaluationRun(
        training_run_id=training_run.id,
        status="queued",
        outputs_path="",
        logs_path="",
    )
    session.add(evaluation)
    session.flush()
    outputs_root = ensure_directory(settings.artifacts_root / "evaluations" / str(evaluation.id))
    evaluation.outputs_path = str(outputs_root)
    evaluation.logs_path = str(outputs_root / "evaluation.log")
    session.commit()
    session.refresh(evaluation)
    return evaluation


def serialize_evaluation_run(run: EvaluationRun) -> EvaluationRunSummary:
    return EvaluationRunSummary(
        id=run.id,
        training_run_id=str(run.training_run_id),
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        outputs_path=run.outputs_path,
        outputs_url=artifact_url(run.outputs_path),
        metrics_json=run.metrics_json,
        created_at=run.created_at,
    )


def serialize_evaluation_detail(run: EvaluationRun) -> EvaluationRunDetail:
    outputs_root = Path(run.outputs_path)
    confusion = outputs_root / "confusion_matrix.png"
    confusion_normalized = outputs_root / "confusion_matrix_normalized.png"
    return EvaluationRunDetail(
        **serialize_evaluation_run(run).model_dump(),
        logs=read_text_file(Path(run.logs_path)),
        confusion_matrix_url=artifact_url(confusion) if confusion.exists() else None,
        normalized_confusion_matrix_url=(
            artifact_url(confusion_normalized) if confusion_normalized.exists() else None
        ),
        sample_prediction_urls=list_image_urls(outputs_root / "predictions", limit=8),
    )


def list_evaluation_runs(session: Session) -> list[EvaluationRunSummary]:
    runs = session.scalars(select(EvaluationRun).order_by(EvaluationRun.created_at.desc())).all()
    return [serialize_evaluation_run(run) for run in runs]


def get_evaluation_run(session: Session, evaluation_run_id: UUID) -> EvaluationRun:
    evaluation_run = session.get(EvaluationRun, evaluation_run_id)
    if evaluation_run is None:
        raise ValueError("Evaluation run not found.")
    return evaluation_run


def execute_evaluation_run(
    evaluation_run_id: UUID, session_factory: Any, settings: Settings
) -> None:
    with session_factory() as session:
        evaluation_run = get_evaluation_run(session, evaluation_run_id)
        training_run = session.get(TrainingRun, evaluation_run.training_run_id)
        if training_run is None:
            raise RuntimeError("Training run not found for evaluation.")
        evaluation_run.status = "running"
        evaluation_run.started_at = utc_now()
        session.commit()
        training_artifact_path = training_run.artifact_path

    outputs_root = ensure_directory(
        settings.artifacts_root / "evaluations" / str(evaluation_run_id)
    )
    log_path = outputs_root / "evaluation.log"
    append_log(log_path, f"[{utc_now().isoformat()}] Starting evaluation run {evaluation_run_id}.")

    try:
        weights_path = Path(training_artifact_path) / "weights" / "best.pt"
        if not weights_path.exists():
            raise FileNotFoundError(f"Could not find best weights at {weights_path}.")

        parsed_yaml = yaml.safe_load(settings.dataset_yaml_path.read_text(encoding="utf-8")) or {}
        evaluation_yaml = materialize_training_yaml(
            dataset_root=settings.dataset_root,
            parsed_yaml=parsed_yaml,
            destination=outputs_root / "dataset.local.yaml",
        )

        model = YOLO(str(weights_path))
        metrics = model.val(
            data=str(evaluation_yaml),
            split="test",
            project=str(outputs_root.parent),
            name=outputs_root.name,
            exist_ok=True,
            verbose=False,
            plots=True,
            save_json=True,
        )
        append_log(log_path, f"[{utc_now().isoformat()}] Validation completed.")

        test_images = sorted((settings.dataset_root / "test" / "images").glob("*"))[:8]
        prediction_root = ensure_directory(outputs_root / "predictions")
        if test_images:
            model.predict(
                source=[str(path) for path in test_images],
                project=str(outputs_root),
                name="predictions",
                exist_ok=True,
                verbose=False,
                save=True,
            )
            append_log(
                log_path,
                f"[{utc_now().isoformat()}] Saved sample predictions to {prediction_root}.",
            )

        metrics_json = {
            "precision": float(metrics.box.mp),
            "recall": float(metrics.box.mr),
            "map50": float(metrics.box.map50),
            "map50_95": float(metrics.box.map),
            "raw": {
                "map75": float(metrics.box.map75),
                "fitness": float(metrics.fitness),
            },
        }

        with session_factory() as session:
            evaluation_run = get_evaluation_run(session, evaluation_run_id)
            evaluation_run.status = "completed"
            evaluation_run.completed_at = utc_now()
            evaluation_run.metrics_json = metrics_json
            session.commit()
    except Exception as exc:
        append_log(log_path, f"[{utc_now().isoformat()}] Evaluation failed: {exc}")
        append_log(log_path, traceback.format_exc())
        with session_factory() as session:
            evaluation_run = get_evaluation_run(session, evaluation_run_id)
            evaluation_run.status = "failed"
            evaluation_run.completed_at = utc_now()
            evaluation_run.metrics_json = {"error": str(exc)}
            session.commit()
