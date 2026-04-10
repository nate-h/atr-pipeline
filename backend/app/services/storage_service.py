from __future__ import annotations

from pathlib import Path

from app.core.config import get_settings

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_text_file(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def append_log(path: Path, message: str) -> None:
    ensure_directory(path.parent)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(message.rstrip() + "\n")


def artifact_url(path: str | Path) -> str | None:
    settings = get_settings()
    candidate = Path(path)
    try:
        relative = candidate.relative_to(settings.artifacts_root)
    except ValueError:
        return None
    return f"/artifacts/{relative.as_posix()}"


def dataset_file_url(path: Path) -> str:
    settings = get_settings()
    relative = path.relative_to(settings.dataset_root)
    return f"/dataset-files/{relative.as_posix()}"


def list_image_urls(root: Path, limit: int = 8) -> list[str]:
    images = [path for path in sorted(root.rglob("*")) if path.suffix.lower() in IMAGE_EXTENSIONS]
    return [url for path in images[:limit] if (url := artifact_url(path)) is not None]
