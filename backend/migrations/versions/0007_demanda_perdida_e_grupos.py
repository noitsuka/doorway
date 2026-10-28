"""demanda perdida e reservas em grupo

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-26
"""

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agendamentos", sa.Column("grupo", sa.String(32)))
    op.create_table(
        "demandas_perdidas",
        sa.Column("id", sa.BigInteger().with_variant(sa.Integer(), "sqlite"), primary_key=True),
        sa.Column(
            "negocio_id",
            sa.Integer(),
            sa.ForeignKey("negocios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("hora", sa.SmallInteger()),
        sa.Column("origem", sa.String(8), nullable=False),
        sa.Column("motivo", sa.String(8), nullable=False),
        sa.Column("visitante", sa.String(16), nullable=False),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("hora BETWEEN 0 AND 23", name="ck_demandas_perdidas_hora"),
        sa.UniqueConstraint(
            "negocio_id",
            "dia",
            "hora",
            "origem",
            "visitante",
            name="uq_demandas_perdidas_visitante",
            postgresql_nulls_not_distinct=True,
        ),
    )
    op.create_index(
        "ix_demandas_perdidas_negocio_criado_em",
        "demandas_perdidas",
        ["negocio_id", "criado_em"],
    )


def downgrade() -> None:
    op.drop_index("ix_demandas_perdidas_negocio_criado_em", table_name="demandas_perdidas")
    op.drop_table("demandas_perdidas")
    op.drop_column("agendamentos", "grupo")
