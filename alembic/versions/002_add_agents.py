"""add agents table and agent_id to data_sources

Revision ID: 002
Revises: 001
Create Date: 2026-05-13
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(50), nullable=False, server_default="offline"),
        sa.Column("last_heartbeat_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_index("ix_agents_user_id", "agents", ["user_id"])
    op.create_index("ix_agents_status", "agents", ["status"])

    op.add_column(
        "data_sources",
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_data_sources_agent_id", "data_sources", ["agent_id"])


def downgrade() -> None:
    op.drop_index("ix_data_sources_agent_id", table_name="data_sources")
    op.drop_column("data_sources", "agent_id")

    op.drop_index("ix_agents_status", table_name="agents")
    op.drop_index("ix_agents_user_id", table_name="agents")
    op.drop_table("agents")
