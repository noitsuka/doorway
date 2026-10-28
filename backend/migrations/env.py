import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.configuracao import obter_configuracao
from app.modelos import Base

target_metadata = Base.metadata


def executar_migracoes(conexao):
    context.configure(connection=conexao, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def executar_migracoes_async():
    motor = create_async_engine(obter_configuracao().url_banco)
    async with motor.connect() as conexao:
        await conexao.run_sync(executar_migracoes)
    await motor.dispose()


if context.is_offline_mode():
    context.configure(url=obter_configuracao().url_banco, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(executar_migracoes_async())
