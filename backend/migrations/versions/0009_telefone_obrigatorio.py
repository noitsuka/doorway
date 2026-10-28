"""telefone identifica o cliente e o e-mail passa a ser opcional

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-28
"""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("agendamentos", "email_cliente", existing_type=sa.String(254), nullable=True)
    op.execute(
        "UPDATE agendamentos SET telefone_cliente = "
        "regexp_replace(telefone_cliente, '[^0-9]', '', 'g') WHERE telefone_cliente IS NOT NULL"
    )
    op.drop_index("ix_agendamentos_negocio_cliente", table_name="agendamentos")
    op.create_index(
        "ix_agendamentos_negocio_cliente", "agendamentos", ["negocio_id", "telefone_cliente"]
    )


def downgrade() -> None:
    op.drop_index("ix_agendamentos_negocio_cliente", table_name="agendamentos")
    op.create_index(
        "ix_agendamentos_negocio_cliente", "agendamentos", ["negocio_id", "email_cliente"]
    )
    op.execute("UPDATE agendamentos SET email_cliente = '' WHERE email_cliente IS NULL")
    op.alter_column("agendamentos", "email_cliente", existing_type=sa.String(254), nullable=False)
