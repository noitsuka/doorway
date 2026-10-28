from collections import Counter
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.configuracao import obter_configuracao
from app.dependencias import IdNaRota, Sessao, UsuarioAtual
from app.esquemas import AgendaDoDia, AgendamentoSaida, DataHoraPlausivel
from app.modelos import Agendamento, StatusAgendamento
from app.painel_publico import para_saida

rotas = APIRouter(prefix="/agendamentos", tags=["agendamentos"])

MAXIMO_DIAS_CONTADOS = 120


@rotas.get("", response_model=list[AgendamentoSaida])
async def listar_agendamentos(
    usuario: UsuarioAtual,
    sessao: Sessao,
    inicio: Annotated[DataHoraPlausivel, Query(description="Inclusivo, ISO 8601 com fuso")],
    fim: Annotated[DataHoraPlausivel, Query(description="Exclusivo, ISO 8601 com fuso")],
    incluir_cancelados: bool = False,
):
    if fim <= inicio:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "O fim precisa ser depois do início."
        )
    if fim - inicio > timedelta(days=obter_configuracao().maximo_dias_listagem):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Período longo demais.")

    consulta = (
        select(Agendamento)
        .options(joinedload(Agendamento.servico))
        .where(
            Agendamento.negocio_id == usuario.negocio_id,
            Agendamento.inicio >= inicio,
            Agendamento.inicio < fim,
        )
        .order_by(Agendamento.inicio)
    )
    if not incluir_cancelados:
        consulta = consulta.where(Agendamento.status == StatusAgendamento.CONFIRMADO)
    resultado = await sessao.scalars(consulta)
    return [para_saida(a, usuario.negocio.slug) for a in resultado]


@rotas.get("/por-dia", response_model=list[AgendaDoDia])
async def contar_por_dia(
    usuario: UsuarioAtual,
    sessao: Sessao,
    de: date,
    quantidade: Annotated[int, Query(ge=1, le=MAXIMO_DIAS_CONTADOS)] = 28,
):
    fuso = ZoneInfo(usuario.negocio.fuso_horario)
    try:
        inicio = datetime.combine(de, time(), fuso)
        fim = datetime.combine(de + timedelta(days=quantidade), time(), fuso)
    except OverflowError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Data fora do intervalo."
        ) from None
    inicios = await sessao.scalars(
        select(Agendamento.inicio).where(
            Agendamento.negocio_id == usuario.negocio_id,
            Agendamento.status == StatusAgendamento.CONFIRMADO,
            Agendamento.inicio >= inicio,
            Agendamento.inicio < fim,
        )
    )
    contagem = Counter(i.astimezone(fuso).date() for i in inicios)
    return [
        AgendaDoDia(data=dia, quantidade=contagem[dia])
        for dia in (de + timedelta(days=i) for i in range(quantidade))
    ]


@rotas.post("/{agendamento_id}/cancelar", response_model=AgendamentoSaida)
async def cancelar_agendamento(agendamento_id: IdNaRota, usuario: UsuarioAtual, sessao: Sessao):
    agendamento = await sessao.scalar(
        select(Agendamento)
        .options(joinedload(Agendamento.servico))
        .where(Agendamento.id == agendamento_id, Agendamento.negocio_id == usuario.negocio_id)
    )
    if agendamento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agendamento não encontrado.")
    if agendamento.status == StatusAgendamento.CANCELADO:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esse agendamento já foi cancelado.")
    if agendamento.inicio <= datetime.now(UTC):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Esse atendimento já começou e não pode ser cancelado."
        )
    agendamento.status = StatusAgendamento.CANCELADO
    await sessao.commit()
    return para_saida(agendamento, usuario.negocio.slug)
