"""add agent_tokens table

Revision ID: 003
Revises: 002
Create Date: 2026-05-14
"""
from typing import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "agent_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "agent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("agents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("token_prefix", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False, server_default="Default"),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    op.create_index("ix_agent_tokens_agent_id", "agent_tokens", ["agent_id"])
    op.create_index("ix_agent_tokens_token_hash", "agent_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_agent_tokens_token_hash", table_name="agent_tokens")
    op.drop_index("ix_agent_tokens_agent_id", table_name="agent_tokens")
    op.drop_table("agent_tokens")
