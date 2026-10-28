import math
import random
import time
from collections.abc import Callable

from fastapi import HTTPException, Request, status
from sqlalchemy import text

from app import banco
from app.configuracao import obter_configuracao

INCREMENTAR = text(
    """
    INSERT INTO limites_requisicao (chave, janela, acessos, expira_em)
    VALUES (:chave, :janela, 1, :expira_em)
    ON CONFLICT (chave, janela) DO UPDATE SET acessos = limites_requisicao.acessos + 1
    RETURNING acessos
    """
)
LIMPAR = text("DELETE FROM limites_requisicao WHERE expira_em < :agora")


async def contar_acesso(
    chave: str, janela_segundos: int, agora: float | None = None
) -> tuple[int, float]:
    agora = time.time() if agora is None else agora
    janela = int(agora // janela_segundos)
    reinicia_em = (janela + 1) * janela_segundos
    async with banco.escopo_sessao(banco.SessaoLeitura) as sessao:
        acessos = await sessao.scalar(
            INCREMENTAR, {"chave": chave[:200], "janela": janela, "expira_em": reinicia_em}
        )
        if random.random() < 0.01:
            await sessao.execute(LIMPAR, {"agora": int(agora)})
    return acessos, reinicia_em - agora


def ip_do_cliente(requisicao: Request) -> str:
    real = requisicao.headers.get("x-real-ip")
    if obter_configuracao().confiar_ip_real and real:
        return real[:64]
    return requisicao.client.host if requisicao.client else "desconhecido"


def limite_requisicoes(nome: str, limite: Callable[[], int], janela_segundos: int):
    async def dependencia(requisicao: Request) -> None:
        if not obter_configuracao().limite_requisicoes_ativo:
            return
        cliente = ip_do_cliente(requisicao)
        acessos, espera = await contar_acesso(f"{nome}:{cliente}", janela_segundos)
        if acessos > limite():
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "Muitas tentativas seguidas. Tente de novo em instantes.",
                headers={"Retry-After": str(max(1, math.ceil(espera)))},
            )

    return dependencia


limite_login = limite_requisicoes(
    "login", lambda: obter_configuracao().tentativas_login_por_minuto, 60
)
limite_cadastro = limite_requisicoes(
    "cadastro", lambda: obter_configuracao().cadastros_por_hora, 3600
)
limite_reserva = limite_requisicoes("reserva", lambda: obter_configuracao().reservas_por_minuto, 60)
limite_corrida = limite_requisicoes("corrida", lambda: obter_configuracao().corridas_por_minuto, 60)
