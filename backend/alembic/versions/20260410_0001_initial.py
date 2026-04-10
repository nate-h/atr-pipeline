"""initial schema

Revision ID: 20260410_0001
Revises:
Create Date: 2026-04-10 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20260410_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("root_path", sa.Text(), nullable=False),
        sa.Column("yaml_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "training_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dataset_id", sa.Integer(), nullable=False),
        sa.Column("model_name", sa.String(length=255), nullable=False),
        sa.Column("epochs", sa.Integer(), nullable=False),
        sa.Column("batch_size", sa.Integer(), nullable=False),
        sa.Column("image_size", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("artifact_path", sa.Text(), nullable=False),
        sa.Column("logs_path", sa.Text(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=True),
        sa.Column("mlflow_run_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "evaluation_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("training_run_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outputs_path", sa.Text(), nullable=False),
        sa.Column("logs_path", sa.Text(), nullable=False),
        sa.Column("metrics_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["training_run_id"], ["training_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("evaluation_runs")
    op.drop_table("training_runs")
    op.drop_table("datasets")
