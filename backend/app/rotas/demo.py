import asyncio
import secrets
import time
from datetime import UTC, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app import banco
from app.configuracao import obter_configuracao
from app.dados_demo import SLUG_LABORATORIO, recriar_demo
from app.disponibilidade import horarios_do_dia
from app.esquemas import CorridaEntrada, CorridaSaida, TentativaCorrida
from app.limite_requisicoes import limite_corrida
from app.modelos import Agendamento, Negocio
from app.reservas import ErroReserva, criar_reserva, travar_servico

rotas = APIRouter(tags=["demonstração"])


async def _horario_livre_no_laboratorio() -> tuple[Negocio, int, datetime]:
    async with banco.escopo_sessao(banco.SessaoLeitura) as sessao:
        laboratorio = await sessao.scalar(
            select(Negocio)
            .options(selectinload(Negocio.servicos))
            .where(Negocio.slug == SLUG_LABORATORIO)
        )
        if laboratorio is None or not laboratorio.servicos:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "O laboratório do teste ainda não foi preparado.",
            )
        servico = laboratorio.servicos[0]
        hoje = datetime.now(UTC).astimezone(ZoneInfo(laboratorio.fuso_horario)).date()
        for adiante in range(1, 30):
            dia = hoje + timedelta(days=adiante)
            horarios = await horarios_do_dia(sessao, laboratorio, servico.duracao_minutos, dia)
            if horarios:
                return laboratorio, servico.id, secrets.choice(horarios)
    raise HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE, "O laboratório está sem horários livres agora."
    )


@rotas.post("/demo/corrida", response_model=CorridaSaida, dependencies=[Depends(limite_corrida)])
async def correr(dados: CorridaEntrada):
    laboratorio, servico_id, horario = await _horario_livre_no_laboratorio()
    rodada = secrets.token_hex(4)

    async def tentar(indice: int) -> tuple[TentativaCorrida, int | None]:
        comeco = time.perf_counter()
        async with banco.escopo_sessao(banco.SessaoEscrita) as sessao:
            servico = await travar_servico(sessao, laboratorio.slug, servico_id)
            try:
                agendamento = await criar_reserva(
                    sessao,
                    servico,
                    inicio=horario,
                    nome_cliente=f"Pedido {indice + 1}",
                    email_cliente=f"corrida-{rodada}-{indice}@example.com",
                    telefone_cliente=None,
                )
                aceito, criado = True, agendamento.id
            except ErroReserva:
                aceito, criado = False, None
        duracao = round((time.perf_counter() - comeco) * 1000, 1)
        return TentativaCorrida(pedido=indice + 1, aceito=aceito, duracao_ms=duracao), criado

    comeco = time.perf_counter()
    respostas = await asyncio.gather(
        *(tentar(i) for i in range(dados.pedidos)), return_exceptions=True
    )
    duracao = round((time.perf_counter() - comeco) * 1000, 1)

    resultados = [r for r in respostas if not isinstance(r, BaseException)]
    criados = [criado for _, criado in resultados if criado is not None]
    if criados:
        async with banco.escopo_sessao(banco.SessaoEscrita) as sessao:
            await sessao.execute(delete(Agendamento).where(Agendamento.id.in_(criados)))
            await sessao.commit()
    if falha := next((r for r in respostas if isinstance(r, BaseException)), None):
        raise falha

    tentativas = [t for t, _ in resultados]
    aceitos = sum(t.aceito for t in tentativas)
    return CorridaSaida(
        horario=horario.astimezone(ZoneInfo(laboratorio.fuso_horario)),
        pedidos=dados.pedidos,
        aceitos=aceitos,
        recusados=dados.pedidos - aceitos,
        duracao_ms=duracao,
        tentativas=tentativas,
    )


@rotas.get("/interno/recriar-demo", include_in_schema=False)
async def recriar_demo_agendado(authorization: Annotated[str | None, Header()] = None):
    segredo = obter_configuracao().segredo_cron
    if not segredo or not secrets.compare_digest(authorization or "", f"Bearer {segredo}"):
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    async with banco.escopo_sessao(banco.SessaoEscrita) as sessao:
        await recriar_demo(sessao)
    return {"status": "recriada"}
