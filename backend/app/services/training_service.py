from __future__ import annotations

import csv
import traceback
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import mlflow
import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from ultralytics import YOLO

from app.core.config import Settings
from app.models.dataset import Dataset
from app.models.evaluation_run import EvaluationRun
from app.models.training_run import TrainingRun
from app.schemas.training import TrainingRunCreate, TrainingRunDetail, TrainingRunSummary
from app.services.dataset_service import get_dataset, materialize_training_yaml
from app.services.storage_service import append_log, artifact_url, ensure_directory, read_text_file


def utc_now() -> datetime:
    return datetime.now(UTC)


def create_training_run(
    session: Session, payload: TrainingRunCreate, settings: Settings
) -> TrainingRun:
    dataset = get_dataset(session)
    run_id = uuid.uuid4()
    run_root = ensure_directory(settings.artifacts_root / "training" / str(run_id))
    run = TrainingRun(
        id=run_id,
        dataset_id=dataset.id,
        model_name=payload.model_name,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        image_size=payload.image_size,
        status="queued",
        artifact_path=str(run_root),
        logs_path=str(run_root / "training.log"),
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return run


def _training_metrics_from_csv(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
    if not rows:
        return {}
    last_row = rows[-1]
    keys = {
        "metrics/precision(B)": "precision",
        "metrics/recall(B)": "recall",
        "metrics/mAP50(B)": "map50",
        "metrics/mAP50-95(B)": "map50_95",
    }
    metrics: dict[str, Any] = {"raw": last_row}
    for source_key, target_key in keys.items():
        value = last_row.get(source_key)
        metrics[target_key] = float(str(value)) if value not in (None, "") else None
    return metrics


def _safe_numeric_metrics(metrics: dict[str, Any]) -> dict[str, float]:
    return {
        key: float(value)
        for key, value in metrics.items()
        if key != "raw" and isinstance(value, (int, float))
    }


def _serialize_evaluation(run: EvaluationRun) -> dict[str, Any]:
    return {
        "id": str(run.id),
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "metrics_json": run.metrics_json,
    }


def serialize_training_run(run: TrainingRun, settings: Settings) -> TrainingRunSummary:
    mlflow_url = settings.mlflow_tracking_uri if run.mlflow_run_id else None
    return TrainingRunSummary(
        id=run.id,
        dataset_id=run.dataset_id,
        model_name=run.model_name,
        epochs=run.epochs,
        batch_size=run.batch_size,
        image_size=run.image_size,
        status=run.status,
        started_at=run.started_at,
        completed_at=run.completed_at,
        artifact_path=run.artifact_path,
        artifact_url=artifact_url(run.artifact_path),
        metrics_json=run.metrics_json,
        mlflow_run_id=run.mlflow_run_id,
        mlflow_url=mlflow_url,
        created_at=run.created_at,
    )


def serialize_training_run_detail(run: TrainingRun, settings: Settings) -> TrainingRunDetail:
    summary = serialize_training_run(run, settings)
    return TrainingRunDetail(
        **summary.model_dump(),
        logs=read_text_file(Path(run.logs_path)),
        evaluations=[_serialize_evaluation(item) for item in run.evaluation_runs],
    )


def list_training_runs(session: Session, settings: Settings) -> list[TrainingRunSummary]:
    runs = session.scalars(select(TrainingRun).order_by(TrainingRun.created_at.desc())).all()
    return [serialize_training_run(run, settings) for run in runs]


def get_training_run_by_id(session: Session, run_id: UUID) -> TrainingRun:
    run = session.scalar(
        select(TrainingRun)
        .where(TrainingRun.id == run_id)
        .options(selectinload(TrainingRun.evaluation_runs))
    )
    if run is None:
        raise ValueError("Training run not found.")
    return run


def execute_training_run(run_id: UUID, session_factory: Any, settings: Settings) -> None:
    with session_factory() as session:
        run = get_training_run_by_id(session, run_id)
        dataset = session.get(Dataset, run.dataset_id)
        if dataset is None:
            raise RuntimeError("Dataset not found for training run.")
        run.status = "running"
        run.started_at = utc_now()
        session.commit()
        model_name = run.model_name
        epochs = run.epochs
        batch_size = run.batch_size
        image_size = run.image_size

    log_path = Path(settings.artifacts_root) / "training" / str(run_id) / "training.log"
    training_root = ensure_directory(settings.artifacts_root / "training" / str(run_id))
    append_log(log_path, f"[{utc_now().isoformat()}] Starting training run {run_id}.")
    mlflow_started = False
    active_run = None

    try:
        parsed_yaml_path = settings.dataset_yaml_path
        training_yaml = materialize_training_yaml(
            dataset_root=settings.dataset_root,
            parsed_yaml=yaml.safe_load(parsed_yaml_path.read_text(encoding="utf-8")) or {},
            destination=training_root / "dataset.local.yaml",
        )
        append_log(
            log_path, f"[{utc_now().isoformat()}] Materialized dataset YAML at {training_yaml}."
        )

        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        mlflow.set_experiment(settings.mlflow_experiment_name)
        active_run = mlflow.start_run(run_name=f"{settings.dataset_name}-{run_id}")
        mlflow_started = True
        mlflow.log_params(
            {
                "dataset_name": settings.dataset_name,
                "model_name": model_name,
                "epochs": epochs,
                "batch_size": batch_size,
                "image_size": image_size,
            }
        )
    except Exception as exc:
        append_log(log_path, f"[{utc_now().isoformat()}] MLflow setup skipped: {exc}")
        mlflow_started = False

    try:
        with session_factory() as session:
            run = get_training_run_by_id(session, run_id)
            if mlflow_started and active_run is not None:
                run.mlflow_run_id = active_run.info.run_id
                session.commit()

        model = YOLO(model_name)
        append_log(log_path, f"[{utc_now().isoformat()}] Loaded model {model_name}.")
        model.train(
            data=str(training_yaml),
            epochs=epochs,
            imgsz=image_size,
            batch=batch_size,
            project=str(training_root.parent),
            name=training_root.name,
            exist_ok=True,
            verbose=False,
            plots=True,
            save_json=True,
        )
        metrics = _training_metrics_from_csv(training_root / "results.csv")
        weights_path = training_root / "weights" / "best.pt"
        if weights_path.exists():
            append_log(log_path, f"[{utc_now().isoformat()}] Best weights saved to {weights_path}.")
        append_log(log_path, f"[{utc_now().isoformat()}] Training finished successfully.")

        if mlflow_started and active_run is not None:
            numeric_metrics = _safe_numeric_metrics(metrics)
            if numeric_metrics:
                mlflow.log_metrics(numeric_metrics)
            mlflow.log_artifacts(str(training_root), artifact_path="training")
            mlflow.end_run(status="FINISHED")

        with session_factory() as session:
            run = get_training_run_by_id(session, run_id)
            run.status = "completed"
            run.completed_at = utc_now()
            run.metrics_json = metrics
            session.commit()
    except Exception as exc:
        append_log(log_path, f"[{utc_now().isoformat()}] Training failed: {exc}")
        append_log(log_path, traceback.format_exc())
        if mlflow_started and active_run is not None:
            mlflow.end_run(status="FAILED")
        with session_factory() as session:
            run = get_training_run_by_id(session, run_id)
            run.status = "failed"
            run.completed_at = utc_now()
            run.metrics_json = {"error": str(exc)}
            session.commit()
