import asyncio
import os

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app import limite_requisicoes
from app.banco import obter_sessao_leitura
from app.configuracao import obter_configuracao
from app.main import app
from app.modelos import LimiteRequisicao

T0 = 1_800_000_000.0


async def test_contadores_sao_por_chave_e_zeram_a_cada_janela(cliente):
    assert await limite_requisicoes.contar_acesso("a", 60, agora=T0) == (1, 60)
    assert (await limite_requisicoes.contar_acesso("a", 60, agora=T0 + 10))[0] == 2
    assert (await limite_requisicoes.contar_acesso("b", 60, agora=T0 + 10))[0] == 1
    assert (await limite_requisicoes.contar_acesso("a", 60, agora=T0 + 60))[0] == 1


@pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)
async def test_contadores_aguentam_acessos_simultaneos(cliente, motor):
    acessos = await asyncio.gather(
        *(limite_requisicoes.contar_acesso("rajada", 60, agora=T0) for _ in range(50))
    )
    assert sorted(a for a, _ in acessos) == list(range(1, 51))
    async with motor.connect() as conexao:
        assert await conexao.scalar(select(func.count()).select_from(LimiteRequisicao)) == 1


async def test_login_tem_limite_por_cliente(cliente, monkeypatch):
    monkeypatch.setattr(limite_requisicoes.time, "time", lambda: T0)
    monkeypatch.setattr(obter_configuracao(), "limite_requisicoes_ativo", True)
    monkeypatch.setattr(obter_configuracao(), "tentativas_login_por_minuto", 3)
    dados = {"email": "ninguem@example.com", "senha": "chute-1234"}

    codigos = [
        (await cliente.post("/autenticacao/login", json=dados)).status_code for _ in range(5)
    ]
    assert codigos == [401, 401, 401, 429, 429]

    bloqueado = await cliente.post("/autenticacao/login", json=dados)
    assert int(bloqueado.headers["retry-after"]) > 0


async def test_toda_resposta_tem_id_e_cabecalhos_de_seguranca(cliente):
    resposta = await cliente.get("/saude")
    assert len(resposta.headers["x-request-id"]) == 32
    assert resposta.headers["x-content-type-options"] == "nosniff"
    assert resposta.headers["x-frame-options"] == "DENY"

    rastreada = await cliente.get("/saude", headers={"X-Request-ID": "rastro-123"})
    assert rastreada.headers["x-request-id"] == "rastro-123"

    forjada = await cliente.get("/saude", headers={"X-Request-ID": "id ruim\r\nx: y"})
    assert forjada.headers["x-request-id"] != "id ruim\r\nx: y"


async def test_erros_de_validacao_nao_devolvem_a_entrada(cliente, dono):
    segredo = "nao-devolver-" + "x" * 500
    resposta = await cliente.post(
        "/servicos", headers=dono, json={"nome": 123, "duracao_minutos": segredo}
    )
    assert resposta.status_code == 422
    assert segredo not in resposta.text
    assert all(set(erro) == {"loc", "msg", "type"} for erro in resposta.json()["detail"])


async def test_erros_inesperados_devolvem_json_com_id(motor):
    async def sessao_que_explode():
        raise RuntimeError("defeito")
        yield  # pragma: no cover

    app.dependency_overrides[obter_sessao_leitura] = sessao_que_explode
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://teste") as cliente:
        resposta = await cliente.get("/saude/pronta", headers={"X-Request-ID": "abc"})
    app.dependency_overrides.clear()

    assert resposta.status_code == 500
    assert resposta.json() == {
        "detail": "Algo deu errado do nosso lado. Tente de novo.",
        "id_requisicao": "abc",
    }
    assert "defeito" not in resposta.text


async def test_envio_em_partes_acima_do_limite_e_recusado(cliente, dono):
    async def partes():
        for _ in range(100):
            yield b"x" * 1024

    resposta = await cliente.post(
        "/servicos", headers={**dono, "Content-Type": "application/json"}, content=partes()
    )
    assert resposta.status_code == 413


def test_urls_de_banco_dos_provedores_sao_normalizadas():
    from app.configuracao import para_url_asyncpg

    assert (
        para_url_asyncpg("postgres://u:p@host/db?sslmode=require&channel_binding=require")
        == "postgresql+asyncpg://u:p@host/db?ssl=require"
    )
    assert para_url_asyncpg("sqlite+aiosqlite://") == "sqlite+aiosqlite://"


async def test_cabecalho_de_ip_real_e_ignorado_sem_confianca(cliente, monkeypatch):
    from starlette.requests import Request

    from app.limite_requisicoes import ip_do_cliente

    escopo = {
        "type": "http",
        "headers": [(b"x-real-ip", b"203.0.113.9")],
        "client": ("10.0.0.1", 1),
    }
    assert ip_do_cliente(Request(escopo)) == "10.0.0.1"
    monkeypatch.setattr(obter_configuracao(), "confiar_ip_real", True)
    assert ip_do_cliente(Request(escopo)) == "203.0.113.9"
