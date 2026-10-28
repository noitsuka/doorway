"""shared rate limit counters

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-19
"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rate_limits",
        sa.Column("key", sa.String(200), primary_key=True),
        sa.Column("bucket", sa.BigInteger, primary_key=True, autoincrement=False),
        sa.Column("hits", sa.Integer, nullable=False),
        sa.Column("expires_at", sa.BigInteger, nullable=False),
    )
    op.create_index("ix_rate_limits_expires_at", "rate_limits", ["expires_at"])


def downgrade() -> None:
    op.drop_table("rate_limits")
