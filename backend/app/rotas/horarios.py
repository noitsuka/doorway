from itertools import pairwise
from typing import Annotated

from fastapi import APIRouter, Body, HTTPException, status
from sqlalchemy import delete, select

from app.dependencias import Sessao, UsuarioAtual
from app.esquemas import HorarioEntrada, HorarioSaida
from app.modelos import HorarioFuncionamento, Negocio

rotas = APIRouter(prefix="/horarios", tags=["horários de funcionamento"])

MAXIMO_INTERVALOS = 7 * 6


def _encontrar_sobreposicao(intervalos: list[HorarioEntrada]) -> HorarioEntrada | None:
    ordenados = sorted(intervalos, key=lambda h: (h.dia_semana, h.abre_as))
    for atual, seguinte in pairwise(ordenados):
        if atual.dia_semana == seguinte.dia_semana and seguinte.abre_as < atual.fecha_as:
            return seguinte
    return None


async def _semana(sessao: Sessao, negocio_id: int):
    resultado = await sessao.scalars(
        select(HorarioFuncionamento)
        .where(HorarioFuncionamento.negocio_id == negocio_id)
        .order_by(HorarioFuncionamento.dia_semana, HorarioFuncionamento.abre_as)
    )
    return resultado.all()


@rotas.get("", response_model=list[HorarioSaida])
async def obter_horarios(usuario: UsuarioAtual, sessao: Sessao):
    return await _semana(sessao, usuario.negocio_id)


@rotas.put("", response_model=list[HorarioSaida])
async def substituir_horarios(
    dados: Annotated[list[HorarioEntrada], Body(max_length=MAXIMO_INTERVALOS)],
    usuario: UsuarioAtual,
    sessao: Sessao,
):
    if sobreposto := _encontrar_sobreposicao(dados):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Intervalos sobrepostos no dia {sobreposto.dia_semana}.",
        )
    await sessao.execute(
        select(Negocio.id).where(Negocio.id == usuario.negocio_id).with_for_update()
    )
    await sessao.execute(
        delete(HorarioFuncionamento).where(HorarioFuncionamento.negocio_id == usuario.negocio_id)
    )
    sessao.add_all(
        HorarioFuncionamento(negocio_id=usuario.negocio_id, **h.model_dump()) for h in dados
    )
    await sessao.commit()
    return await _semana(sessao, usuario.negocio_id)
