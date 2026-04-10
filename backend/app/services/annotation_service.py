from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Literal
from zipfile import ZipFile

import yaml
from fastapi import UploadFile

from app.core.config import get_settings
from app.schemas.annotation import (
    AnnotationBox,
    AnnotationImageDetailResponse,
    AnnotationImageListResponse,
    AnnotationImageSummary,
    AnnotationInfoResponse,
    AnnotationSaveResponse,
    AnnotationSyncResponse,
)
from app.services.storage_service import IMAGE_EXTENSIONS, dataset_file_url, ensure_directory

IGNORED_EXPORT_FILES = {
    "classes.txt",
    "obj.names",
    "obj.data",
    "train.txt",
    "valid.txt",
    "test.txt",
}
SplitName = Literal["train", "valid", "test"]


def _class_names() -> list[str]:
    settings = get_settings()
    parsed_yaml = yaml.safe_load(settings.dataset_yaml_path.read_text(encoding="utf-8")) or {}
    names = parsed_yaml.get("names", [])
    if isinstance(names, dict):
        return [str(value) for _, value in sorted(names.items())]
    if isinstance(names, list):
        return [str(value) for value in names]
    return ["ship"]


def _split_root(split: SplitName) -> Path:
    settings = get_settings()
    return settings.dataset_root / split


def _label_path(split: SplitName, image_name: str) -> Path:
    return _split_root(split) / "labels" / f"{Path(image_name).stem}.txt"


def _image_path(split: SplitName, image_name: str) -> Path:
    return _split_root(split) / "images" / image_name


def _parse_label_file(label_path: Path) -> list[AnnotationBox]:
    if not label_path.exists():
        return []

    boxes: list[AnnotationBox] = []
    for line in label_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        parts = stripped.split()
        if len(parts) != 5:
            continue
        class_id, x_center, y_center, width, height = parts
        boxes.append(
            AnnotationBox(
                class_id=int(float(class_id)),
                x_center=float(x_center),
                y_center=float(y_center),
                width=float(width),
                height=float(height),
            )
        )
    return boxes


def _serialize_boxes(boxes: list[AnnotationBox]) -> str:
    lines = []
    for box in boxes:
        lines.append(
            f"{box.class_id} {box.x_center:.6f} {box.y_center:.6f} {box.width:.6f} {box.height:.6f}"
        )
    return "\n".join(lines) + ("\n" if lines else "")


def _validate_boxes(boxes: list[AnnotationBox]) -> list[AnnotationBox]:
    validated: list[AnnotationBox] = []
    for box in boxes:
        validated.append(
            AnnotationBox(
                class_id=max(0, box.class_id),
                x_center=min(max(box.x_center, 0.0), 1.0),
                y_center=min(max(box.y_center, 0.0), 1.0),
                width=min(max(box.width, 0.0), 1.0),
                height=min(max(box.height, 0.0), 1.0),
            )
        )
    return [box for box in validated if box.width > 0 and box.height > 0]


def get_annotation_info() -> AnnotationInfoResponse:
    settings = get_settings()
    instructions = [
        "Choose a dataset split and image from the in-app annotator.",
        "Draw bounding boxes around ships directly on the image canvas.",
        "Saving writes YOLO-format labels straight into the dataset labels folder for that split.",
        "Use bulk import only if you already have YOLO label archives from another source.",
    ]
    return AnnotationInfoResponse(
        mode="native-yolo-box-annotator",
        dataset_root=str(settings.dataset_root),
        classes=_class_names(),
        instructions=instructions,
    )


def list_annotation_images(split: SplitName) -> AnnotationImageListResponse:
    image_dir = _split_root(split) / "images"
    images = []
    for path in sorted(image_dir.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        label_path = _label_path(split, path.name)
        box_count = len(_parse_label_file(label_path))
        images.append(
            AnnotationImageSummary(
                image_name=path.name,
                image_url=dataset_file_url(path),
                has_annotations=label_path.exists() and box_count > 0,
                box_count=box_count,
            )
        )
    return AnnotationImageListResponse(split=split, images=images)


def get_annotation_image_detail(split: SplitName, image_name: str) -> AnnotationImageDetailResponse:
    image_path = _image_path(split, image_name)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_name}")
    label_path = _label_path(split, image_name)
    return AnnotationImageDetailResponse(
        split=split,
        image_name=image_name,
        image_url=dataset_file_url(image_path),
        label_path=str(label_path),
        classes=_class_names(),
        boxes=_parse_label_file(label_path),
    )


def save_annotation_boxes(
    split: SplitName,
    image_name: str,
    boxes: list[AnnotationBox],
) -> AnnotationSaveResponse:
    image_path = _image_path(split, image_name)
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_name}")

    label_path = _label_path(split, image_name)
    ensure_directory(label_path.parent)
    validated_boxes = _validate_boxes(boxes)
    label_path.write_text(_serialize_boxes(validated_boxes), encoding="utf-8")

    return AnnotationSaveResponse(
        split=split,
        image_name=image_name,
        label_path=str(label_path),
        saved_count=len(validated_boxes),
    )


def sync_yolo_archive(split: str, archive: UploadFile) -> AnnotationSyncResponse:
    settings = get_settings()
    destination = ensure_directory(settings.dataset_root / split / "labels")

    with tempfile.TemporaryDirectory() as temp_dir:
        archive_path = Path(temp_dir) / (archive.filename or "annotations.zip")
        with archive_path.open("wb") as buffer:
            shutil.copyfileobj(archive.file, buffer)

        extract_dir = Path(temp_dir) / "extracted"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with ZipFile(archive_path, "r") as zip_file:
            zip_file.extractall(extract_dir)

        txt_files = sorted(
            path
            for path in extract_dir.rglob("*.txt")
            if path.is_file() and path.name not in IGNORED_EXPORT_FILES
        )

        skipped_files: list[str] = []
        synced_count = 0
        for file_path in txt_files:
            target = destination / file_path.name
            shutil.copyfile(file_path, target)
            synced_count += 1

        if synced_count == 0:
            skipped_files.append("No YOLO label `.txt` files were found in the uploaded archive.")

    return AnnotationSyncResponse(
        split=split,
        synced_count=synced_count,
        destination=str(destination),
        skipped_files=skipped_files,
    )
