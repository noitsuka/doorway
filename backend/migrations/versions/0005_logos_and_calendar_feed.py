"""business logos and calendar subscription feed

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-19
"""

import secrets

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("businesses", sa.Column("logo_version", sa.Integer()))
    op.add_column("businesses", sa.Column("calendar_token", sa.String(64)))

    businesses = sa.table("businesses", sa.column("id"), sa.column("calendar_token"))
    connection = op.get_bind()
    for (business_id,) in connection.execute(sa.select(businesses.c.id)):
        connection.execute(
            businesses.update()
            .where(businesses.c.id == business_id)
            .values(calendar_token=secrets.token_urlsafe(32))
        )

    with op.batch_alter_table("businesses") as batch:
        batch.alter_column("calendar_token", existing_type=sa.String(64), nullable=False)
        batch.create_unique_constraint("uq_businesses_calendar_token", ["calendar_token"])

    op.create_table(
        "business_logos",
        sa.Column(
            "business_id",
            sa.Integer(),
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("content_type", sa.String(16), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("business_logos")
    with op.batch_alter_table("businesses") as batch:
        batch.drop_constraint("uq_businesses_calendar_token", type_="unique")
        batch.drop_column("calendar_token")
        batch.drop_column("logo_version")
