from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencias import Sessao, SessaoLeitura
from app.esquemas import AgendamentoGerenciadoSaida, RemarcacaoEntrada
from app.limite_requisicoes import limite_reserva
from app.modelos import Agendamento, Servico, StatusAgendamento
from app.reservas import ErroReserva, remarcar_reserva, travar_servico

rotas = APIRouter(prefix="/gestao/{token}", tags=["gestão do agendamento"])

Token = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{20,64}$")]
NAO_ENCONTRADO = HTTPException(
    status.HTTP_404_NOT_FOUND, "Não encontramos esse agendamento. Confira o link."
)
JA_COMECOU = "Esse horário já começou e não pode mais ser alterado."
CANCELADO = "Esse agendamento foi cancelado."


def _por_token(token: str):
    return (
        select(Agendamento)
        .options(
            joinedload(Agendamento.servico).joinedload(Servico.negocio),
            joinedload(Agendamento.negocio),
        )
        .where(Agendamento.token_gestao == token)
    )


def _garantir_alteravel(agendamento: Agendamento) -> None:
    if agendamento.status == StatusAgendamento.CANCELADO:
        raise HTTPException(status.HTTP_409_CONFLICT, CANCELADO)
    if agendamento.inicio <= datetime.now(UTC):
        raise HTTPException(status.HTTP_409_CONFLICT, JA_COMECOU)


@rotas.get("", response_model=AgendamentoGerenciadoSaida)
async def obter_agendamento(token: Token, sessao: SessaoLeitura):
    agendamento = await sessao.scalar(_por_token(token))
    if agendamento is None:
        raise NAO_ENCONTRADO
    return agendamento


@rotas.post("/cancelar", response_model=AgendamentoGerenciadoSaida)
async def cancelar(token: Token, sessao: Sessao):
    agendamento = await sessao.scalar(_por_token(token))
    if agendamento is None:
        raise NAO_ENCONTRADO
    _garantir_alteravel(agendamento)
    agendamento.status = StatusAgendamento.CANCELADO
    await sessao.commit()
    return agendamento


@rotas.post(
    "/remarcar",
    response_model=AgendamentoGerenciadoSaida,
    dependencies=[Depends(limite_reserva)],
)
async def remarcar(token: Token, dados: RemarcacaoEntrada, sessao: Sessao):
    agendamento = await sessao.scalar(_por_token(token))
    if agendamento is None:
        raise NAO_ENCONTRADO
    _garantir_alteravel(agendamento)

    servico = await travar_servico(sessao, agendamento.negocio.slug, agendamento.servico_id)
    if servico is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Esse serviço não está mais disponível.")
    try:
        await remarcar_reserva(sessao, agendamento, servico, dados.inicio)
    except ErroReserva as erro:
        raise HTTPException(status.HTTP_409_CONFLICT, erro.detalhe) from None
    return agendamento
