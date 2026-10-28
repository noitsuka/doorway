"""index upcoming bookings by customer

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-19
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_appointments_business_customer", "appointments", ["business_id", "customer_email"]
    )


def downgrade() -> None:
    op.drop_index("ix_appointments_business_customer", table_name="appointments")
