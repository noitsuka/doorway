import secrets
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import String, cast, distinct, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import contains_eager

from app.antifraude import conferir_bloqueio, conferir_limite_da_conexao
from app.configuracao import obter_configuracao
from app.disponibilidade import horarios_do_dia
from app.modelos import Agendamento, Negocio, Servico, StatusAgendamento

HORARIO_OCUPADO = "Esse horário acabou de ser reservado. Escolha outro."
LIMITE_ATINGIDO = "Esse telefone já tem o máximo de agendamentos futuros neste local."


class ErroReserva(Exception):
    def __init__(self, detalhe: str) -> None:
        super().__init__(detalhe)
        self.detalhe = detalhe


def consulta_servicos_ativos(slug: str, servico_ids: Sequence[int]):
    return (
        select(Servico)
        .join(Servico.negocio)
        .options(contains_eager(Servico.negocio))
        .where(Negocio.slug == slug, Servico.id.in_(set(servico_ids)), Servico.ativo)
    )


def na_ordem_pedida(
    servicos: Sequence[Servico], servico_ids: Sequence[int]
) -> list[Servico] | None:
    por_id = {s.id: s for s in servicos}
    if set(por_id) != set(servico_ids):
        return None
    return [por_id[i] for i in servico_ids]


async def travar_servicos(
    sessao: AsyncSession, slug: str, servico_ids: Sequence[int]
) -> list[Servico] | None:
    resultado = await sessao.scalars(
        consulta_servicos_ativos(slug, servico_ids).with_for_update(of=Negocio)
    )
    return na_ordem_pedida(resultado.unique().all(), servico_ids)


async def travar_servico(sessao: AsyncSession, slug: str, servico_id: int) -> Servico | None:
    servicos = await travar_servicos(sessao, slug, [servico_id])
    return servicos[0] if servicos else None


async def garantir_livre(
    sessao: AsyncSession,
    negocio: Negocio,
    duracao_minutos: int,
    inicio: datetime,
    exceto_id: int | None = None,
) -> None:
    dia = inicio.astimezone(ZoneInfo(negocio.fuso_horario)).date()
    livres = await horarios_do_dia(sessao, negocio, duracao_minutos, dia, exceto_id=exceto_id)
    if inicio not in livres:
        raise ErroReserva(HORARIO_OCUPADO)


async def _garantir_limite_por_cliente(
    sessao: AsyncSession, negocio_id: int, telefone: str
) -> None:
    reserva = func.coalesce(Agendamento.grupo, cast(Agendamento.id, String))
    futuras = await sessao.scalar(
        select(func.count(distinct(reserva))).where(
            Agendamento.negocio_id == negocio_id,
            Agendamento.telefone_cliente == telefone,
            Agendamento.status == StatusAgendamento.CONFIRMADO,
            Agendamento.fim > datetime.now(UTC),
        )
    )
    if futuras >= obter_configuracao().maximo_reservas_futuras_por_cliente:
        raise ErroReserva(LIMITE_ATINGIDO)


async def reservar_em_sequencia(
    sessao: AsyncSession,
    pessoas: Sequence[tuple[Servico, str]],
    *,
    inicio: datetime,
    email_cliente: str | None,
    telefone_cliente: str,
    conexao: str | None = None,
) -> list[Agendamento]:
    negocio = pessoas[0][0].negocio
    duracao_total = sum(servico.duracao_minutos for servico, _ in pessoas)
    await garantir_livre(sessao, negocio, duracao_total, inicio)

    email = email_cliente.lower() if email_cliente else None
    await conferir_bloqueio(sessao, negocio.id, email, telefone_cliente)
    await _garantir_limite_por_cliente(sessao, negocio.id, telefone_cliente)
    if conexao:
        await conferir_limite_da_conexao(sessao, negocio.id, conexao, datetime.now(UTC))

    grupo = secrets.token_hex(8) if len(pessoas) > 1 else None
    agendamentos, cursor = [], inicio
    for servico, nome in pessoas:
        fim = cursor + timedelta(minutes=servico.duracao_minutos)
        agendamentos.append(
            Agendamento(
                negocio_id=negocio.id,
                servico=servico,
                nome_cliente=nome,
                email_cliente=email,
                telefone_cliente=telefone_cliente,
                inicio=cursor,
                fim=fim,
                grupo=grupo,
                conexao=conexao,
            )
        )
        cursor = fim
    sessao.add_all(agendamentos)
    await _confirmar(sessao)
    return agendamentos


async def criar_reserva(
    sessao: AsyncSession,
    servico: Servico,
    *,
    inicio: datetime,
    nome_cliente: str,
    email_cliente: str | None,
    telefone_cliente: str,
) -> Agendamento:
    (agendamento,) = await reservar_em_sequencia(
        sessao,
        [(servico, nome_cliente)],
        inicio=inicio,
        email_cliente=email_cliente,
        telefone_cliente=telefone_cliente,
    )
    return agendamento


async def remarcar_reserva(
    sessao: AsyncSession, agendamento: Agendamento, servico: Servico, inicio: datetime
) -> None:
    await garantir_livre(
        sessao, servico.negocio, servico.duracao_minutos, inicio, exceto_id=agendamento.id
    )
    inicio = inicio.astimezone(UTC)
    agendamento.inicio = inicio
    agendamento.fim = inicio + timedelta(minutes=servico.duracao_minutos)
    await _confirmar(sessao)


async def _confirmar(sessao: AsyncSession) -> None:
    try:
        await sessao.commit()
    except IntegrityError:
        await sessao.rollback()
        raise ErroReserva(HORARIO_OCUPADO) from None
