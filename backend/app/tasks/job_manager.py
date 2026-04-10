from __future__ import annotations

from concurrent.futures import Future, ThreadPoolExecutor
from uuid import UUID

from app.core.config import Settings
from app.db.session import SessionLocal
from app.services.evaluation_service import execute_evaluation_run
from app.services.training_service import execute_training_run


class JobManager:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="atr-workbench")
        self.jobs: dict[str, Future[None]] = {}

    def submit_training(self, run_id: UUID) -> None:
        future = self.executor.submit(execute_training_run, run_id, SessionLocal, self.settings)
        self.jobs[f"training:{run_id}"] = future

    def submit_evaluation(self, evaluation_run_id: UUID) -> None:
        future = self.executor.submit(
            execute_evaluation_run,
            evaluation_run_id,
            SessionLocal,
            self.settings,
        )
        self.jobs[f"evaluation:{evaluation_run_id}"] = future
