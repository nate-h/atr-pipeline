from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "ATR Ship Workbench"
    api_prefix: str = "/api"
    debug: bool = False
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/atr_workbench"
    dataset_name: str = "ships-aerial-images"
    dataset_root: Path = Path("/app/data/ships-aerial-images")
    dataset_yaml_path: Path = Path("/app/data/ships-aerial-images/data.yaml")
    artifacts_root: Path = Path("/app/artifacts")
    mlflow_tracking_uri: str = "http://mlflow:5000"
    mlflow_experiment_name: str = "atr-ship-detection"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
