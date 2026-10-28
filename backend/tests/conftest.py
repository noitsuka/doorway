import os

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("JWT_SECRET", "segredo-de-teste-com-pelo-menos-32-bytes")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")
os.environ.setdefault("MIN_FORM_SECONDS", "0")
os.environ.setdefault("MAX_UPCOMING_BOOKINGS_PER_IP", "1000")

from datetime import date, datetime, time, timedelta  # noqa: E402
from zoneinfo import ZoneInfo  # noqa: E402

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import banco  # noqa: E402
from app.antifraude import gerar_token_formulario  # noqa: E402
from app.banco import obter_sessao, obter_sessao_leitura  # noqa: E402
from app.main import app  # noqa: E402
from app.modelos import Base  # noqa: E402

SP = ZoneInfo("America/Sao_Paulo")


@pytest.fixture(scope="session")
async def motor():
    url = os.environ["DATABASE_URL"]
    opcoes = {"poolclass": StaticPool} if url.startswith("sqlite") else {}
    motor = create_async_engine(url, **opcoes)
    async with motor.begin() as conexao:
        await conexao.run_sync(Base.metadata.drop_all)
        await conexao.run_sync(Base.metadata.create_all)
    yield motor
    await motor.dispose()


@pytest.fixture(autouse=True)
async def limpar_tabelas(motor):
    yield
    async with motor.begin() as conexao:
        for tabela in reversed(Base.metadata.sorted_tables):
            await conexao.execute(tabela.delete())


@pytest.fixture
async def cliente(motor):
    sessoes = async_sessionmaker(motor, expire_on_commit=False)
    sessoes_leitura = async_sessionmaker(
        motor.execution_options(isolation_level="AUTOCOMMIT"), expire_on_commit=False
    )

    async def sessao_de_teste():
        async with sessoes() as sessao:
            yield sessao

    async def sessao_leitura_de_teste():
        async with sessoes_leitura() as sessao:
            yield sessao

    app.dependency_overrides[obter_sessao] = sessao_de_teste
    app.dependency_overrides[obter_sessao_leitura] = sessao_leitura_de_teste
    originais = banco.SessaoEscrita, banco.SessaoLeitura
    banco.SessaoEscrita, banco.SessaoLeitura = sessoes, sessoes_leitura
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://teste") as cliente:
        yield cliente
    app.dependency_overrides.clear()
    banco.SessaoEscrita, banco.SessaoLeitura = originais


async def cadastrar(cliente: AsyncClient, slug: str = "studio-ana", email: str = "ana@example.com"):
    resposta = await cliente.post(
        "/autenticacao/cadastro",
        json={
            "nome_negocio": "Studio Ana",
            "slug": slug,
            "fuso_horario": "America/Sao_Paulo",
            "nome": "Ana",
            "email": email,
            "senha": "s3nha-secreta",
        },
    )
    assert resposta.status_code == 201, resposta.text
    return {"Authorization": f"Bearer {resposta.json()['token_acesso']}"}


@pytest.fixture
async def dono(cliente):
    return await cadastrar(cliente)


@pytest.fixture
def proxima_segunda() -> date:
    hoje = date.today()
    return hoje + timedelta(days=7 - hoje.weekday())


@pytest.fixture
async def servico_id(cliente, dono):
    await cliente.put(
        "/horarios",
        headers=dono,
        json=[{"dia_semana": 0, "abre_as": "09:00", "fecha_as": "12:00"}],
    )
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Corte", "duracao_minutos": 30, "preco_centavos": 6000},
    )
    return criado.json()["id"]


def em(dia, hora, minuto=0) -> str:
    return datetime.combine(dia, time(hora, minuto), SP).isoformat()


async def obter_horarios(cliente, servico_id, dia):
    resposta = await cliente.get(
        "/publico/studio-ana/horarios-livres",
        params={"servico_id": servico_id, "dia": dia.isoformat()},
    )
    assert resposta.status_code == 200, resposta.text
    return [datetime.fromisoformat(h) for h in resposta.json()["horarios"]]


async def reservar(cliente, servico_id, inicio, **extra):
    dados = {
        "servico_id": servico_id,
        "inicio": inicio,
        "nome_cliente": "Carla",
        "email_cliente": "carla@example.com",
        "telefone_cliente": "11987654321",
        "token_formulario": gerar_token_formulario("studio-ana"),
    } | extra
    return await cliente.post("/publico/studio-ana/agendamentos", json=dados)
