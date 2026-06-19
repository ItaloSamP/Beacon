"""alert_rules_structured_fields

Revision ID: 668aa0d35679
Revises: 004
Create Date: 2026-06-19 01:07:15.996872
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "668aa0d35679"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Drop legacy free-text condition column
    op.drop_column("alert_rules", "condition")
    # Add structured threshold fields
    op.add_column("alert_rules", sa.Column("metric", sa.String(50), nullable=False))
    op.add_column("alert_rules", sa.Column("operator", sa.String(10), nullable=False))
    op.add_column("alert_rules", sa.Column("threshold", sa.Float(), nullable=False))


def downgrade() -> None:
    op.drop_column("alert_rules", "threshold")
    op.drop_column("alert_rules", "operator")
    op.drop_column("alert_rules", "metric")
    op.add_column("alert_rules", sa.Column("condition", sa.String(500), nullable=False))
