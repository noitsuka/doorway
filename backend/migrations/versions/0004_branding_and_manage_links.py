"""business branding and appointment manage links

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-19
"""

import secrets

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("category", sa.String(40)))
    op.add_column("businesses", sa.Column("tagline", sa.String(160)))
    op.add_column(
        "businesses",
        sa.Column("brand_color", sa.String(7), nullable=False, server_default="#2e4cf6"),
    )
    op.add_column("appointments", sa.Column("manage_token", sa.String(64)))

    appointments = sa.table("appointments", sa.column("id"), sa.column("manage_token"))
    connection = op.get_bind()
    for (appointment_id,) in connection.execute(sa.select(appointments.c.id)):
        connection.execute(
            appointments.update()
            .where(appointments.c.id == appointment_id)
            .values(manage_token=secrets.token_urlsafe(32))
        )

    with op.batch_alter_table("appointments") as batch:
        batch.alter_column("manage_token", existing_type=sa.String(64), nullable=False)
        batch.create_unique_constraint("uq_appointments_manage_token", ["manage_token"])


def downgrade() -> None:
    with op.batch_alter_table("appointments") as batch:
        batch.drop_constraint("uq_appointments_manage_token", type_="unique")
        batch.drop_column("manage_token")
    op.drop_column("businesses", "brand_color")
    op.drop_column("businesses", "tagline")
    op.drop_column("businesses", "category")
