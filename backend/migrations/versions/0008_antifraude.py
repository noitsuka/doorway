"""antifraude: conexão da reserva e clientes bloqueados

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-27
"""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("agendamentos", sa.Column("conexao", sa.String(16)))
    op.create_table(
        "bloqueios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "negocio_id",
            sa.Integer(),
            sa.ForeignKey("negocios.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(254)),
        sa.Column("telefone", sa.String(15)),
        sa.Column(
            "criado_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_bloqueios_negocio_id", "bloqueios", ["negocio_id"])


def downgrade() -> None:
    op.drop_index("ix_bloqueios_negocio_id", table_name="bloqueios")
    op.drop_table("bloqueios")
    op.drop_column("agendamentos", "conexao")
