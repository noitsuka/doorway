"""tabelas, colunas e restrições com nomes em português

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-20
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None

TABELAS = [
    ("businesses", "negocios"),
    ("business_logos", "logos_negocio"),
    ("users", "usuarios"),
    ("services", "servicos"),
    ("working_hours", "horarios_funcionamento"),
    ("appointments", "agendamentos"),
    ("rate_limits", "limites_requisicao"),
]

COLUNAS = {
    "negocios": [
        ("name", "nome"),
        ("timezone", "fuso_horario"),
        ("category", "categoria"),
        ("tagline", "chamada"),
        ("brand_color", "cor_marca"),
        ("logo_version", "versao_logo"),
        ("calendar_token", "token_agenda"),
        ("created_at", "criado_em"),
    ],
    "logos_negocio": [
        ("business_id", "negocio_id"),
        ("content_type", "tipo_conteudo"),
        ("data", "dados"),
    ],
    "usuarios": [
        ("business_id", "negocio_id"),
        ("name", "nome"),
        ("password_hash", "hash_senha"),
        ("created_at", "criado_em"),
    ],
    "servicos": [
        ("business_id", "negocio_id"),
        ("name", "nome"),
        ("duration_minutes", "duracao_minutos"),
        ("price_cents", "preco_centavos"),
        ("active", "ativo"),
    ],
    "horarios_funcionamento": [
        ("business_id", "negocio_id"),
        ("weekday", "dia_semana"),
        ("opens_at", "abre_as"),
        ("closes_at", "fecha_as"),
    ],
    "agendamentos": [
        ("business_id", "negocio_id"),
        ("service_id", "servico_id"),
        ("customer_name", "nome_cliente"),
        ("customer_email", "email_cliente"),
        ("customer_phone", "telefone_cliente"),
        ("manage_token", "token_gestao"),
        ("starts_at", "inicio"),
        ("ends_at", "fim"),
        ("created_at", "criado_em"),
    ],
    "limites_requisicao": [
        ("key", "chave"),
        ("bucket", "janela"),
        ("hits", "acessos"),
        ("expires_at", "expira_em"),
    ],
}

RESTRICOES = {
    "negocios": [
        ("businesses_pkey", "negocios_pkey"),
        ("businesses_slug_key", "uq_negocios_slug"),
        ("uq_businesses_calendar_token", "uq_negocios_token_agenda"),
    ],
    "logos_negocio": [
        ("business_logos_pkey", "logos_negocio_pkey"),
        ("business_logos_business_id_fkey", "logos_negocio_negocio_id_fkey"),
    ],
    "usuarios": [
        ("users_pkey", "usuarios_pkey"),
        ("users_email_key", "uq_usuarios_email"),
        ("users_business_id_fkey", "usuarios_negocio_id_fkey"),
    ],
    "servicos": [
        ("services_pkey", "servicos_pkey"),
        ("services_business_id_fkey", "servicos_negocio_id_fkey"),
        ("ck_services_duration_positive", "ck_servicos_duracao_positiva"),
        ("ck_services_price_non_negative", "ck_servicos_preco_nao_negativo"),
    ],
    "horarios_funcionamento": [
        ("working_hours_pkey", "horarios_funcionamento_pkey"),
        ("working_hours_business_id_fkey", "horarios_funcionamento_negocio_id_fkey"),
        ("working_hours_business_id_weekday_opens_at_key", "uq_horarios_funcionamento_inicio"),
        ("ck_working_hours_weekday", "ck_horarios_funcionamento_dia_semana"),
        ("ck_working_hours_range", "ck_horarios_funcionamento_intervalo"),
    ],
    "agendamentos": [
        ("appointments_pkey", "agendamentos_pkey"),
        ("appointments_business_id_fkey", "agendamentos_negocio_id_fkey"),
        ("appointments_service_id_fkey", "agendamentos_servico_id_fkey"),
        ("ck_appointments_range", "ck_agendamentos_intervalo"),
        ("uq_appointments_manage_token", "uq_agendamentos_token_gestao"),
    ],
    "limites_requisicao": [
        ("rate_limits_pkey", "limites_requisicao_pkey"),
    ],
}

INDICES = [
    ("ix_services_business_id", "ix_servicos_negocio_id"),
    ("ix_working_hours_business_id", "ix_horarios_funcionamento_negocio_id"),
    ("ix_appointments_business_starts_at", "ix_agendamentos_negocio_inicio"),
    ("ix_appointments_business_customer", "ix_agendamentos_negocio_cliente"),
    ("ix_rate_limits_expires_at", "ix_limites_requisicao_expira_em"),
]

SEQUENCIAS = [
    ("businesses_id_seq", "negocios_id_seq"),
    ("users_id_seq", "usuarios_id_seq"),
    ("services_id_seq", "servicos_id_seq"),
    ("working_hours_id_seq", "horarios_funcionamento_id_seq"),
    ("appointments_id_seq", "agendamentos_id_seq"),
]

STATUS = [("confirmed", "confirmado"), ("cancelled", "cancelado")]


def _renomear(avancando: bool) -> None:
    def pares(itens):
        return itens if avancando else [(novo, antigo) for antigo, novo in itens]

    def tabela_atual(tabela_nova: str) -> str:
        if avancando:
            return tabela_nova
        return next(antigo for antigo, novo in TABELAS if novo == tabela_nova)

    for antigo, novo in pares(TABELAS):
        op.execute(f"ALTER TABLE {antigo} RENAME TO {novo}")

    for tabela, colunas in COLUNAS.items():
        for antigo, novo in pares(colunas):
            op.execute(f'ALTER TABLE {tabela_atual(tabela)} RENAME COLUMN "{antigo}" TO "{novo}"')

    for antigo, novo in pares(STATUS):
        op.execute(
            f"UPDATE {tabela_atual('agendamentos')} SET status = '{novo}' WHERE status = '{antigo}'"
        )

    for tabela, restricoes in RESTRICOES.items():
        for antigo, novo in pares(restricoes):
            op.execute(f"ALTER TABLE {tabela_atual(tabela)} RENAME CONSTRAINT {antigo} TO {novo}")

    for antigo, novo in pares(INDICES):
        op.execute(f"ALTER INDEX {antigo} RENAME TO {novo}")
    for antigo, novo in pares(SEQUENCIAS):
        op.execute(f"ALTER SEQUENCE {antigo} RENAME TO {novo}")


def upgrade() -> None:
    op.execute("ALTER TABLE appointments DROP CONSTRAINT ex_appointments_no_overlap")
    _renomear(avancando=True)
    op.execute(
        "ALTER TABLE agendamentos ADD CONSTRAINT ex_agendamentos_sem_sobreposicao "
        "EXCLUDE USING gist (negocio_id WITH =, tstzrange(inicio, fim) WITH &&) "
        "WHERE (status <> 'cancelado')"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE agendamentos DROP CONSTRAINT ex_agendamentos_sem_sobreposicao")
    _renomear(avancando=False)
    op.execute(
        "ALTER TABLE appointments ADD CONSTRAINT ex_appointments_no_overlap "
        "EXCLUDE USING gist (business_id WITH =, tstzrange(starts_at, ends_at) WITH &&) "
        "WHERE (status <> 'cancelled')"
    )
