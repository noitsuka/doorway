import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.configuracao import Configuracao, obter_configuracao


def criar_engine(configuracao: Configuracao) -> AsyncEngine:
    if not configuracao.url_banco.startswith("postgresql"):
        return create_async_engine(configuracao.url_banco)

    limite_segundos = configuracao.limite_consulta_ms / 1000
    pool = (
        {"poolclass": NullPool}
        if configuracao.sem_pool
        else {
            "pool_size": configuracao.tamanho_pool,
            "max_overflow": configuracao.excedente_pool,
            "pool_timeout": configuracao.espera_pool_segundos,
            "pool_recycle": 1800,
            "pool_use_lifo": True,
        }
    )
    return create_async_engine(
        configuracao.url_banco,
        **pool,
        connect_args={
            "server_settings": {"statement_timeout": str(configuracao.limite_consulta_ms)},
            "command_timeout": limite_segundos + 1,
            "timeout": configuracao.espera_pool_segundos,
        },
    )


configuracao = obter_configuracao()
engine = criar_engine(configuracao)
SessaoEscrita = async_sessionmaker(engine, expire_on_commit=False)
SessaoLeitura = async_sessionmaker(
    engine.execution_options(isolation_level="AUTOCOMMIT"), expire_on_commit=False
)

_vagas_conexao = asyncio.Semaphore(configuracao.tamanho_pool + configuracao.excedente_pool)


@asynccontextmanager
async def escopo_sessao(fabrica: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncSession]:
    async with asyncio.timeout(configuracao.espera_pool_segundos):
        await _vagas_conexao.acquire()
    try:
        async with fabrica() as sessao:
            yield sessao
    finally:
        _vagas_conexao.release()


async def obter_sessao() -> AsyncIterator[AsyncSession]:
    async with escopo_sessao(SessaoEscrita) as sessao:
        yield sessao


async def obter_sessao_leitura() -> AsyncIterator[AsyncSession]:
    async with escopo_sessao(SessaoLeitura) as sessao:
        yield sessao
