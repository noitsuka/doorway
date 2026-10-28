"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-19
"""

import sqlalchemy as sa
from alembic import op

DATA_HORA = sa.DateTime(timezone=True)
SEM_SOBREPOSICAO = """
ALTER TABLE appointments ADD CONSTRAINT ex_appointments_no_overlap
EXCLUDE USING gist (business_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
WHERE (status <> 'cancelled')
"""

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "businesses",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(60), nullable=False, unique=True),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("created_at", DATA_HORA, server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", DATA_HORA, server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "services",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column("price_cents", sa.Integer, nullable=False),
        sa.Column("active", sa.Boolean, nullable=False),
        sa.CheckConstraint("duration_minutes > 0", name="ck_services_duration_positive"),
        sa.CheckConstraint("price_cents >= 0", name="ck_services_price_non_negative"),
    )
    op.create_table(
        "working_hours",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("weekday", sa.Integer, nullable=False),
        sa.Column("opens_at", sa.Time, nullable=False),
        sa.Column("closes_at", sa.Time, nullable=False),
        sa.CheckConstraint("weekday BETWEEN 0 AND 6", name="ck_working_hours_weekday"),
        sa.CheckConstraint("opens_at < closes_at", name="ck_working_hours_range"),
        sa.UniqueConstraint("business_id", "weekday", "opens_at"),
    )
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "business_id",
            sa.Integer,
            sa.ForeignKey("businesses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "service_id",
            sa.Integer,
            sa.ForeignKey("services.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("customer_name", sa.String(120), nullable=False),
        sa.Column("customer_email", sa.String(254), nullable=False),
        sa.Column("customer_phone", sa.String(32)),
        sa.Column("starts_at", DATA_HORA, nullable=False),
        sa.Column("ends_at", DATA_HORA, nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", DATA_HORA, server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("starts_at < ends_at", name="ck_appointments_range"),
    )
    op.create_index(
        "ix_appointments_business_starts_at", "appointments", ["business_id", "starts_at"]
    )

    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
        op.execute(SEM_SOBREPOSICAO)


def downgrade() -> None:
    op.drop_table("appointments")
    op.drop_table("working_hours")
    op.drop_table("services")
    op.drop_table("users")
    op.drop_table("businesses")
