"""add fk indexes for user isolation

Revision ID: 004
Revises: 003
Create Date: 2026-06-09
"""
from collections.abc import Sequence

from alembic import op

revision: str = "004"
down_revision: str | None = "003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ix_agents_user_id already exists from 002_add_agents
    # ix_data_sources_agent_id already exists from 002_add_agents

    op.create_index("ix_pipeline_runs_pipeline_id", "pipeline_runs", ["pipeline_id"])
    op.create_index("ix_anomalies_pipeline_run_id", "anomalies", ["pipeline_run_id"])
    op.create_index("ix_alerts_anomaly_id", "alerts", ["anomaly_id"])
    op.create_index("ix_pipelines_data_source_id", "pipelines", ["data_source_id"])


def downgrade() -> None:
    op.drop_index("ix_pipelines_data_source_id", table_name="pipelines")
    op.drop_index("ix_alerts_anomaly_id", table_name="alerts")
    op.drop_index("ix_anomalies_pipeline_run_id", table_name="anomalies")
    op.drop_index("ix_pipeline_runs_pipeline_id", table_name="pipeline_runs")
