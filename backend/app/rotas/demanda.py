from typing import Annotated

from fastapi import APIRouter, Query

from app.demanda import relatorio
from app.dependencias import Sessao, UsuarioAtual
from app.esquemas import DemandaSaida

rotas = APIRouter(prefix="/demanda", tags=["demanda perdida"])


@rotas.get("", response_model=DemandaSaida)
async def obter_demanda(
    usuario: UsuarioAtual, sessao: Sessao, dias: Annotated[int, Query(ge=7, le=90)] = 30
):
    return await relatorio(sessao, usuario.negocio_id, dias)
