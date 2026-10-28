import asyncio
import os
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError
from sqlalchemy import exc

from app import banco
from app.banco import obter_sessao_leitura
from app.configuracao import Configuracao
from app.main import app
from tests.conftest import em, reservar

ID_ENORME = 2**40
exige_postgres = pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)


async def test_ids_enormes_sao_recusados_antes_do_banco(cliente, dono):
    assert (await cliente.patch(f"/servicos/{ID_ENORME}", headers=dono, json={})).status_code == 422
    assert (
        await cliente.post(f"/agendamentos/{ID_ENORME}/cancelar", headers=dono)
    ).status_code == 422
    resposta = await cliente.get(
        "/publico/studio-ana/horarios-livres", params={"servico_id": ID_ENORME, "dia": "2026-11-09"}
    )
    assert resposta.status_code == 422


async def test_campos_nulos_na_atualizacao_sao_ignorados(cliente, dono):
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Corte", "duracao_minutos": 30, "preco_centavos": 0},
    )
    resposta = await cliente.patch(
        f"/servicos/{criado.json()['id']}",
        headers=dono,
        json={"nome": None, "preco_centavos": 10},
    )
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Corte"
    assert resposta.json()["preco_centavos"] == 10


async def test_preco_tem_limite_maximo(cliente, dono):
    resposta = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Ouro", "duracao_minutos": 30, "preco_centavos": 2**40},
    )
    assert resposta.status_code == 422


async def test_login_com_email_desconhecido(cliente):
    resposta = await cliente.post(
        "/autenticacao/login", json={"email": "fantasma@example.com", "senha": "qualquer-123"}
    )
    assert resposta.status_code == 401


async def test_senha_enorme_e_recusada_sem_gerar_hash(cliente, dono):
    resposta = await cliente.post(
        "/autenticacao/login", json={"email": "ana@example.com", "senha": "x" * 10_000}
    )
    assert resposta.status_code == 422


async def test_hash_de_senha_nao_trava_o_loop(cliente):
    batidas = 0

    async def pulso():
        nonlocal batidas
        while True:
            batidas += 1
            await asyncio.sleep(0.005)

    tarefa = asyncio.create_task(pulso())
    await cliente.post(
        "/autenticacao/login", json={"email": "a@example.com", "senha": "senha-1234"}
    )
    tarefa.cancel()
    assert batidas > 1


async def test_tokens_vencidos_e_sem_assinatura_sao_recusados(cliente, dono):
    segredo = os.environ["JWT_SECRET"]
    vencido = jwt.encode(
        {"sub": "1", "exp": datetime.now(UTC) - timedelta(minutes=1)}, segredo, "HS256"
    )
    sem_validade = jwt.encode({"sub": "1"}, segredo, "HS256")
    forjado = jwt.encode({"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)}, "x" * 32)
    sujeito_enorme = jwt.encode(
        {"sub": str(ID_ENORME), "exp": datetime.now(UTC) + timedelta(hours=1)}, segredo, "HS256"
    )
    for token in (vencido, sem_validade, forjado, sujeito_enorme):
        resposta = await cliente.get(
            "/autenticacao/eu", headers={"Authorization": f"Bearer {token}"}
        )
        assert resposta.status_code == 401


def test_segredo_jwt_curto_impede_a_inicializacao():
    with pytest.raises(ValidationError):
        Configuracao(JWT_SECRET="curto")


async def test_periodo_da_listagem_e_limitado(cliente, dono):
    periodo = {"inicio": "2026-01-01T00:00:00Z", "fim": "2026-06-01T00:00:00Z"}
    resposta = await cliente.get("/agendamentos", headers=dono, params=periodo)
    assert resposta.status_code == 422


async def test_listagem_exige_fuso(cliente, dono):
    periodo = {"inicio": "2026-01-01T00:00:00", "fim": "2026-01-02T00:00:00"}
    resposta = await cliente.get("/agendamentos", headers=dono, params=periodo)
    assert resposta.status_code == 422


async def test_dias_passados_e_extremos_nao_tem_horarios(cliente, servico_id):
    for dia in ("2020-01-06", "0001-01-01", "9999-12-31"):
        resposta = await cliente.get(
            "/publico/studio-ana/horarios-livres", params={"servico_id": servico_id, "dia": dia}
        )
        assert resposta.status_code == 200
        assert resposta.json()["horarios"] == []


async def test_reserva_muito_fora_do_calendario_e_recusada(cliente, servico_id):
    for inicio in ("9999-12-31T23:00:00-12:00", "0001-01-01T00:00:00+14:00"):
        assert (await reservar(cliente, servico_id, inicio)).status_code == 422


async def test_horarios_recusam_fuso_e_enxurrada(cliente, dono):
    com_fuso = [{"dia_semana": 0, "abre_as": "09:00+03:00", "fecha_as": "12:00"}]
    assert (await cliente.put("/horarios", headers=dono, json=com_fuso)).status_code == 422

    enxurrada = [{"dia_semana": 0, "abre_as": "09:00", "fecha_as": "09:15"}] * 100
    assert (await cliente.put("/horarios", headers=dono, json=enxurrada)).status_code == 422


async def test_prontidao_confere_o_banco(cliente):
    assert (await cliente.get("/saude/pronta")).json() == {"status": "ok", "banco": "ok"}


async def test_queda_do_banco_devolve_503_rapido(cliente):
    async def sessao_quebrada():
        raise exc.OperationalError("SELECT 1", {}, ConnectionRefusedError("fora do ar"))
        yield  # pragma: no cover

    app.dependency_overrides[obter_sessao_leitura] = sessao_quebrada
    resposta = await cliente.get("/saude/pronta")
    assert resposta.status_code == 503
    assert resposta.headers["retry-after"] == "5"


@pytest.mark.parametrize("sqlstate, esperado", [("53300", 503), ("40P01", 503), ("22003", 500)])
async def test_so_erros_transitorios_do_banco_viram_503(motor, sqlstate, esperado):
    class ErroDoDriver(Exception):
        pass

    ErroDoDriver.sqlstate = sqlstate

    async def sessao_com_falha():
        raise exc.DBAPIError("SELECT 1", {}, ErroDoDriver("falhou"))
        yield  # pragma: no cover

    app.dependency_overrides[obter_sessao_leitura] = sessao_com_falha
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="http://teste") as cliente:
        resposta = await cliente.get("/saude/pronta")
    app.dependency_overrides.clear()
    assert resposta.status_code == esperado


async def test_vagas_de_conexao_sao_fifo_e_expiram(monkeypatch):
    monkeypatch.setattr(banco, "_vagas_conexao", asyncio.Semaphore(1))
    monkeypatch.setattr(banco.configuracao, "espera_pool_segundos", 0.2)
    ordem = []

    async def usar(nome, segurar):
        async with banco.escopo_sessao(banco.SessaoLeitura):
            ordem.append(nome)
            await asyncio.sleep(segurar)

    primeira = asyncio.create_task(usar("primeira", 0.05))
    await asyncio.sleep(0)
    na_fila = [asyncio.create_task(usar(f"f{i}", 0)) for i in range(5)]
    await asyncio.gather(primeira, *na_fila)
    assert ordem == ["primeira", "f0", "f1", "f2", "f3", "f4"]

    async with banco.escopo_sessao(banco.SessaoLeitura):
        with pytest.raises(TimeoutError):
            async with banco.escopo_sessao(banco.SessaoLeitura):
                pass


@exige_postgres
async def test_reservas_simultaneas_no_mesmo_horario(cliente, servico_id, proxima_segunda):
    respostas = await asyncio.gather(
        *(
            reservar(
                cliente, servico_id, em(proxima_segunda, 9), telefone_cliente=f"119000000{i:02d}"
            )
            for i in range(20)
        )
    )
    codigos = [r.status_code for r in respostas]
    assert codigos.count(201) == 1
    assert codigos.count(409) == 19


@exige_postgres
async def test_reservas_simultaneas_sobrepostas(cliente, servico_id, proxima_segunda):
    inicios = [em(proxima_segunda, 10), em(proxima_segunda, 10, 15)] * 10
    respostas = await asyncio.gather(*(reservar(cliente, servico_id, i) for i in inicios))
    assert [r.status_code for r in respostas].count(201) == 1


@exige_postgres
async def test_horarios_salvos_ao_mesmo_tempo(cliente, dono):
    semanas = [
        [{"dia_semana": 0, "abre_as": f"{h:02d}:00", "fecha_as": f"{h + 1:02d}:00"}]
        for h in range(8, 18)
    ]
    respostas = await asyncio.gather(
        *(cliente.put("/horarios", headers=dono, json=s) for s in semanas)
    )
    assert all(r.status_code == 200 for r in respostas)
    assert len((await cliente.get("/horarios", headers=dono)).json()) == 1
