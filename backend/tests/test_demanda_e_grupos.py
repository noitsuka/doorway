import asyncio
import os
from collections import Counter
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import insert, select

from app import demanda
from app.antifraude import gerar_token_formulario
from app.demanda import sugerir_abertura
from app.modelos import Agendamento, DemandaPerdida, MotivoDemanda, Negocio, OrigemDemanda
from tests.conftest import cadastrar, em, obter_horarios, reservar

exige_postgres = pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)


@pytest.fixture
async def barba_id(cliente, dono, servico_id):
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Barba", "duracao_minutos": 60, "preco_centavos": 4000},
    )
    return criado.json()["id"]


def grupo(inicio: str, pessoas: list[tuple[str, int]], telefone: str = "11912345678"):
    return {
        "inicio": inicio,
        "email_cliente": "familia@example.com",
        "telefone_cliente": telefone,
        "pessoas": [{"nome_cliente": n, "servico_id": s} for n, s in pessoas],
        "token_formulario": gerar_token_formulario("studio-ana"),
    }


async def reservar_grupo(cliente, dados):
    return await cliente.post("/publico/studio-ana/agendamentos/grupo", json=dados)


async def demandas(motor) -> list[DemandaPerdida]:
    async with motor.connect() as conexao:
        return (await conexao.execute(select(DemandaPerdida))).all()


async def test_grupo_reserva_em_sequencia_e_compartilha_o_codigo(
    cliente, dono, servico_id, barba_id, proxima_segunda
):
    resposta = await reservar_grupo(
        cliente,
        grupo(em(proxima_segunda, 9), [("Pai", barba_id), ("Filho", servico_id)]),
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    pai, filho = corpo["agendamentos"]
    assert pai["nome_cliente"] == "Pai" and filho["nome_cliente"] == "Filho"
    assert datetime.fromisoformat(pai["fim"]) == datetime.fromisoformat(filho["inicio"])
    assert datetime.fromisoformat(filho["fim"]) == datetime.fromisoformat(
        em(proxima_segunda, 10, 30)
    )
    assert pai["grupo"] == filho["grupo"] == corpo["grupo"]
    assert pai["token_gestao"] != filho["token_gestao"]

    lista = await cliente.get(
        "/agendamentos",
        headers=dono,
        params={"inicio": em(proxima_segunda, 0), "fim": em(proxima_segunda, 23)},
    )
    assert {a["grupo"] for a in lista.json()} == {corpo["grupo"]}


async def test_grupo_e_tudo_ou_nada(cliente, servico_id, barba_id, proxima_segunda, motor):
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 10))).status_code == 201

    resposta = await reservar_grupo(
        cliente,
        grupo(em(proxima_segunda, 9), [("Pai", barba_id), ("Filho", servico_id)]),
    )
    assert resposta.status_code == 409

    async with motor.connect() as conexao:
        nomes = (await conexao.scalars(select(Agendamento.nome_cliente))).all()
    assert nomes == ["Carla"]


async def test_horarios_livres_consideram_a_duracao_do_grupo(
    cliente, servico_id, barba_id, proxima_segunda
):
    resposta = await cliente.get(
        "/publico/studio-ana/horarios-livres",
        params={"servico_id": [servico_id, barba_id], "dia": proxima_segunda.isoformat()},
    )
    corpo = resposta.json()
    assert corpo["duracao_minutos"] == 90
    assert corpo["servicos"] == [servico_id, barba_id]
    ultimo = datetime.fromisoformat(corpo["horarios"][-1])
    assert ultimo == datetime.fromisoformat(em(proxima_segunda, 10, 30))


async def test_grupo_conta_como_uma_reserva_no_limite_por_cliente(
    cliente, servico_id, proxima_segunda
):
    telefone = "11912345678"
    dupla = grupo(em(proxima_segunda, 9), [("Ana", servico_id), ("Bia", servico_id)], telefone)
    assert (await reservar_grupo(cliente, dupla)).status_code == 201
    for hora in (10, 11):
        resposta = await reservar(
            cliente, servico_id, em(proxima_segunda, hora), telefone_cliente=telefone
        )
        assert resposta.status_code == 201
    excedente = await reservar(
        cliente, servico_id, em(proxima_segunda, 11, 30), telefone_cliente=telefone
    )
    assert excedente.status_code == 409


async def test_grupo_valida_tamanho_e_servicos(cliente, servico_id, proxima_segunda):
    sozinho = grupo(em(proxima_segunda, 9), [("Ana", servico_id)])
    assert (await reservar_grupo(cliente, sozinho)).status_code == 422
    cinco = grupo(em(proxima_segunda, 9), [(f"Pessoa {i}", servico_id) for i in range(5)])
    assert (await reservar_grupo(cliente, cinco)).status_code == 422

    outro = await cadastrar(cliente, slug="outro-lugar", email="outro@example.com")
    alheio = await cliente.post(
        "/servicos",
        headers=outro,
        json={"nome": "Alheio", "duracao_minutos": 30, "preco_centavos": 100},
    )
    misturado = grupo(em(proxima_segunda, 9), [("Ana", servico_id), ("Bia", alheio.json()["id"])])
    assert (await reservar_grupo(cliente, misturado)).status_code == 404


@exige_postgres
async def test_grupo_e_reserva_simples_disputando_o_mesmo_horario(
    cliente, servico_id, barba_id, proxima_segunda, motor
):
    respostas = await asyncio.gather(
        reservar_grupo(
            cliente, grupo(em(proxima_segunda, 9), [("Pai", barba_id), ("Filho", servico_id)])
        ),
        reservar(cliente, servico_id, em(proxima_segunda, 10), email_cliente="rival@example.com"),
    )
    assert sorted(r.status_code for r in respostas) == [201, 409]


async def test_dia_fechado_registra_demanda_perdida(cliente, servico_id, proxima_segunda, motor):
    terca = proxima_segunda + timedelta(days=1)
    assert await obter_horarios(cliente, servico_id, terca) == []

    (registro,) = await demandas(motor)
    assert registro.dia == terca
    assert registro.hora is None
    assert registro.motivo == MotivoDemanda.FECHADO
    assert len(registro.visitante) == 16


@exige_postgres
async def test_consultas_repetidas_do_mesmo_visitante_contam_uma_vez(
    cliente, servico_id, proxima_segunda, motor
):
    terca = proxima_segunda + timedelta(days=1)
    for _ in range(3):
        await obter_horarios(cliente, servico_id, terca)
    assert len(await demandas(motor)) == 1


async def test_dia_lotado_registra_motivo_lotado(cliente, servico_id, proxima_segunda, motor):
    for indice in range(6):
        inicio = datetime.fromisoformat(em(proxima_segunda, 9)) + timedelta(minutes=30 * indice)
        resposta = await reservar(
            cliente, servico_id, inicio.isoformat(), telefone_cliente=f"1190000000{indice}"
        )
        assert resposta.status_code == 201
    assert await obter_horarios(cliente, servico_id, proxima_segunda) == []

    (registro,) = await demandas(motor)
    assert registro.motivo == MotivoDemanda.LOTADO


async def test_dia_com_horario_livre_nao_registra(cliente, servico_id, proxima_segunda, motor):
    assert await obter_horarios(cliente, servico_id, proxima_segunda)
    assert await demandas(motor) == []


async def test_busca_fora_do_expediente_registra_a_hora_pedida(cliente, servico_id, motor):
    resposta = await cliente.get(
        "/publico/studio-ana/busca",
        params={"servico_id": servico_id, "frase": "segunda que vem às 19h"},
    )
    assert resposta.json()["entendido"] is True
    assert resposta.json()["horarios"] == []

    (registro,) = await demandas(motor)
    assert registro.dia.weekday() == 0
    assert registro.hora == 19
    assert registro.motivo == MotivoDemanda.FECHADO


async def test_dono_ve_o_mapa_e_a_sugestao_so_do_proprio_negocio(
    cliente, dono, servico_id, proxima_segunda
):
    for dia in (1, 2, 3):
        await obter_horarios(cliente, servico_id, proxima_segunda + timedelta(days=dia))
    await cliente.get(
        "/publico/studio-ana/busca",
        params={"servico_id": servico_id, "frase": "segunda que vem às 19h"},
    )

    relatorio = (await cliente.get("/demanda", headers=dono)).json()
    assert relatorio["total"] == 4
    assert relatorio["fechado"] == 4 and relatorio["lotado"] == 0
    assert {(c["dia_semana"], c["hora"]) for c in relatorio["celulas"]} == {
        (1, None),
        (2, None),
        (3, None),
        (0, 19),
    }

    outro = await cadastrar(cliente, slug="outro-lugar", email="outro@example.com")
    assert (await cliente.get("/demanda", headers=outro)).json()["total"] == 0
    assert (await cliente.get("/demanda")).status_code == 401
    assert (await cliente.get("/demanda", headers=dono, params={"dias": 365})).status_code == 422


def test_sugestao_escolhe_a_janela_fechada_mais_pedida():
    fechado, lotado = MotivoDemanda.FECHADO, MotivoDemanda.LOTADO
    contagem = Counter(
        {
            (5, 14, fechado): 9,
            (5, 15, fechado): 7,
            (5, 16, fechado): 4,
            (2, 19, fechado): 5,
            (4, 17, lotado): 30,
            (6, None, fechado): 6,
        }
    )
    sugestao = sugerir_abertura(contagem)
    assert (sugestao.dia_semana, sugestao.de, sugestao.ate, sugestao.pedidos) == (5, 14, 17, 20)


def test_sem_demanda_suficiente_nao_ha_sugestao():
    assert sugerir_abertura(Counter({(1, 10, MotivoDemanda.FECHADO): 1})) is None
    assert sugerir_abertura(Counter({(1, 10, MotivoDemanda.LOTADO): 50})) is None


async def test_registros_antigos_sao_apagados(
    cliente, servico_id, proxima_segunda, motor, monkeypatch
):
    async with motor.begin() as conexao:
        negocio_id = (await conexao.execute(select(Negocio.id))).scalar_one()
        await conexao.execute(
            insert(DemandaPerdida).values(
                negocio_id=negocio_id,
                dia=proxima_segunda,
                origem=OrigemDemanda.DIA,
                motivo=MotivoDemanda.FECHADO,
                visitante="antigo",
                criado_em=datetime.now(UTC) - timedelta(days=demanda.RETENCAO_DIAS + 1),
            )
        )
    monkeypatch.setattr(demanda.random, "random", lambda: 0.0)
    await obter_horarios(cliente, servico_id, proxima_segunda + timedelta(days=1))

    assert "antigo" not in {d.visitante for d in await demandas(motor)}
