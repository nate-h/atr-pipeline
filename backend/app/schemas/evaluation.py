from __future__ import annotations

from typing import Any

from app.schemas.common import RunBase


class EvaluationRunSummary(RunBase):
    training_run_id: str
    outputs_path: str
    outputs_url: str | None
    metrics_json: dict[str, Any] | None


class EvaluationRunDetail(EvaluationRunSummary):
    logs: str
    confusion_matrix_url: str | None
    normalized_confusion_matrix_url: str | None
    sample_prediction_urls: list[str]
