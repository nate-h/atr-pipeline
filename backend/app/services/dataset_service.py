from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.dataset import Dataset
from app.models.training_run import TrainingRun
from app.schemas.dataset import (
    DatasetSummaryResponse,
    DatasetValidationResponse,
    SplitSummary,
    SplitValidation,
)
from app.services.storage_service import IMAGE_EXTENSIONS, dataset_file_url, ensure_directory


def _load_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        parsed = yaml.safe_load(handle) or {}
    return parsed


def _class_names(parsed_yaml: dict[str, Any]) -> list[str]:
    names = parsed_yaml.get("names", [])
    if isinstance(names, dict):
        return [str(value) for _, value in sorted(names.items())]
    if isinstance(names, list):
        return [str(item) for item in names]
    return []


def _split_dir(root: Path, split: str) -> Path:
    return root / split


def _image_files(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return [
        file
        for file in sorted(path.iterdir())
        if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS
    ]


def _label_files(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(file for file in path.glob("*.txt") if file.is_file())


def build_split_summary(root: Path, split: str) -> tuple[SplitSummary, SplitValidation]:
    split_root = _split_dir(root, split)
    image_dir = split_root / "images"
    label_dir = split_root / "labels"
    image_files = _image_files(image_dir)
    label_files = _label_files(label_dir)

    image_stems = {path.stem for path in image_files}
    label_stems = {path.stem for path in label_files}

    missing_label_files = sorted(f"{stem}.txt" for stem in image_stems - label_stems)
    orphan_label_files = sorted(f"{stem}.txt" for stem in label_stems - image_stems)
    empty_label_files = sorted(path.name for path in label_files if path.stat().st_size == 0)
    sample_images = [dataset_file_url(path) for path in image_files[:6]]

    summary = SplitSummary(
        name=split,
        image_count=len(image_files),
        label_count=len(label_files),
        empty_label_count=len(empty_label_files),
        missing_label_count=len(missing_label_files),
        orphan_label_count=len(orphan_label_files),
        sample_images=sample_images,
    )
    validation = SplitValidation(
        name=split,
        missing_label_files=missing_label_files[:25],
        orphan_label_files=orphan_label_files[:25],
        empty_label_files=empty_label_files[:25],
        sample_images=sample_images,
    )
    return summary, validation


def build_normalized_yaml(dataset_root: Path, parsed_yaml: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(parsed_yaml)
    normalized["train"] = str(dataset_root / "train" / "images")
    normalized["val"] = str(dataset_root / "valid" / "images")
    normalized["test"] = str(dataset_root / "test" / "images")
    normalized["names"] = _class_names(parsed_yaml)
    normalized["nc"] = len(normalized["names"])
    return normalized


def materialize_training_yaml(
    dataset_root: Path, parsed_yaml: dict[str, Any], destination: Path
) -> Path:
    normalized = build_normalized_yaml(dataset_root, parsed_yaml)
    ensure_directory(destination.parent)
    destination.write_text(yaml.safe_dump(normalized, sort_keys=False), encoding="utf-8")
    return destination


def get_dataset(session: Session) -> Dataset:
    settings = get_settings()
    dataset = session.scalar(
        select(Dataset)
        .where(Dataset.name == settings.dataset_name)
        .options(selectinload(Dataset.training_runs))
    )
    if dataset is None:
        raise RuntimeError("Dataset record not found.")
    return dataset


def get_dataset_summary(session: Session) -> DatasetSummaryResponse:
    dataset = get_dataset(session)
    root = Path(dataset.root_path)
    parsed_yaml = _load_yaml(Path(dataset.yaml_path))
    splits: list[SplitSummary] = []
    for split in ("train", "valid", "test"):
        summary, _validation = build_split_summary(root, split)
        splits.append(summary)

    last_run = session.scalar(
        select(TrainingRun)
        .where(TrainingRun.dataset_id == dataset.id)
        .order_by(TrainingRun.created_at.desc())
    )

    return DatasetSummaryResponse(
        id=dataset.id,
        name=dataset.name,
        root_path=dataset.root_path,
        yaml_path=dataset.yaml_path,
        parsed_yaml=parsed_yaml,
        normalized_yaml=build_normalized_yaml(root, parsed_yaml),
        classes=_class_names(parsed_yaml),
        splits=splits,
        last_training_run=(
            {
                "id": str(last_run.id),
                "status": last_run.status,
                "model_name": last_run.model_name,
                "started_at": last_run.started_at.isoformat() if last_run.started_at else None,
                "completed_at": last_run.completed_at.isoformat()
                if last_run.completed_at
                else None,
                "metrics_json": last_run.metrics_json,
            }
            if last_run is not None
            else None
        ),
    )


def validate_dataset(session: Session) -> DatasetValidationResponse:
    dataset = get_dataset(session)
    root = Path(dataset.root_path)
    parsed_yaml = _load_yaml(Path(dataset.yaml_path))
    warnings: list[str] = []
    validations: list[SplitValidation] = []

    for split in ("train", "valid", "test"):
        summary, validation = build_split_summary(root, split)
        if summary.missing_label_count:
            warnings.append(f"{split} has {summary.missing_label_count} images without labels.")
        if summary.orphan_label_count:
            warnings.append(
                f"{split} has {summary.orphan_label_count} labels without matching images."
            )
        if summary.empty_label_count:
            warnings.append(f"{split} has {summary.empty_label_count} empty label files.")
        validations.append(validation)

    if parsed_yaml.get("train") != str(root / "train" / "images"):
        warnings.append(
            "data.yaml uses non-local image paths. "
            "The backend rewrites them for training inside the container."
        )

    return DatasetValidationResponse(
        dataset_id=dataset.id,
        dataset_name=dataset.name,
        classes=_class_names(parsed_yaml),
        warnings=warnings,
        splits=validations,
    )
