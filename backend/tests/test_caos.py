import asyncio
import os
import random
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import text

from app.antifraude import gerar_token_formulario
from tests.conftest import cadastrar

pytestmark = pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)

SP = ZoneInfo("America/Sao_Paulo")
NEGOCIOS = ("alfa", "bravo", "charlie")
RODADAS, CONCORRENCIA = 8, 60
PERMITIDOS = {200, 201, 204, 401, 404, 409, 413, 422}


async def preparar_negocio(cliente, slug):
    cabecalhos = await cadastrar(cliente, slug=slug, email=f"dono@{slug}.com")
    semana = [{"dia_semana": d, "abre_as": "09:00", "fecha_as": "12:00"} for d in range(7)] + [
        {"dia_semana": d, "abre_as": "13:00", "fecha_as": "18:00"} for d in range(7)
    ]
    await cliente.put("/horarios", headers=cabecalhos, json=semana)
    servicos = []
    for nome, minutos in (("curto", 15), ("medio", 30), ("longo", 90)):
        criado = await cliente.post(
            "/servicos",
            headers=cabecalhos,
            json={"nome": nome, "duracao_minutos": minutos, "preco_centavos": 1000},
        )
        servicos.append(criado.json()["id"])
    return cabecalhos, servicos


def inicio_aleatorio(sorteio, dia):
    local = datetime.combine(
        dia, time(sorteio.randrange(8, 19), sorteio.choice([0, 15, 30, 45])), SP
    )
    if sorteio.random() < 0.1:
        local += timedelta(minutes=sorteio.choice([1, 7, 59]))
    return local.isoformat()


async def test_caos(cliente, motor):
    sorteio = random.Random(int(os.environ.get("CHAOS_SEED", "20261019")))
    donos = {slug: await preparar_negocio(cliente, slug) for slug in NEGOCIOS}
    amanha = datetime.now(SP).date() + timedelta(days=1)
    dias = [amanha + timedelta(days=i) for i in range(3)]
    clientes = [f"119000000{i:02d}" for i in range(12)]
    resultados: list[tuple[str, int]] = []

    async def operacao():
        slug = sorteio.choice(NEGOCIOS)
        cabecalhos, servicos = donos[slug]
        dado = sorteio.random()
        if dado < 0.45:
            dados = {
                "servico_id": sorteio.choice(servicos),
                "inicio": inicio_aleatorio(sorteio, sorteio.choice(dias)),
                "nome_cliente": "Caos",
                "telefone_cliente": sorteio.choice(clientes),
                "token_formulario": gerar_token_formulario(slug),
            }
            resposta = await cliente.post(f"/publico/{slug}/agendamentos", json=dados)
            tipo = "reserva"
        elif dado < 0.65:
            consulta = {
                "servico_id": sorteio.choice(servicos),
                "dia": sorteio.choice(dias).isoformat(),
            }
            resposta = await cliente.get(f"/publico/{slug}/horarios-livres", params=consulta)
            tipo = "horarios"
        elif dado < 0.75:
            inicio = datetime.combine(dias[0], time.min, SP)
            periodo = {
                "inicio": inicio.isoformat(),
                "fim": (inicio + timedelta(days=4)).isoformat(),
            }
            listagem = await cliente.get("/agendamentos", headers=cabecalhos, params=periodo)
            itens = listagem.json()
            if itens:
                alvo = sorteio.choice(itens)["id"]
                resposta = await cliente.post(f"/agendamentos/{alvo}/cancelar", headers=cabecalhos)
            else:
                resposta = listagem
            tipo = "cancelamento"
        elif dado < 0.80:
            fecha = sorteio.choice(["11:00", "12:00", "17:00", "18:00"])
            semana = [{"dia_semana": d, "abre_as": "09:00", "fecha_as": fecha} for d in range(7)]
            resposta = await cliente.put("/horarios", headers=cabecalhos, json=semana)
            tipo = "expediente"
        elif dado < 0.85:
            outro = sorteio.choice([s for s in NEGOCIOS if s != slug])
            vitima = donos[outro][1][0]
            resposta = await cliente.patch(
                f"/servicos/{vitima}", headers=cabecalhos, json={"preco_centavos": 0}
            )
            tipo = "outro-negocio"
        else:
            lixo = sorteio.choice(
                [
                    {"servico_id": -1},
                    {"servico_id": 2**40, "inicio": "x"},
                    {"inicio": "9999-12-31T23:59:59+14:00"},
                    {"nome_cliente": "a\x00b", "email_cliente": "a@b.co"},
                    [],
                    None,
                ]
            )
            resposta = await cliente.post(f"/publico/{slug}/agendamentos", json=lixo)
            tipo = "lixo"
        resultados.append((tipo, resposta.status_code))

    for _ in range(RODADAS):
        await asyncio.gather(*(operacao() for _ in range(CONCORRENCIA)))

    inesperados = [r for r in resultados if r[1] not in PERMITIDOS]
    assert not inesperados, inesperados
    assert all(codigo == 404 for tipo, codigo in resultados if tipo == "outro-negocio")
    assert any(codigo == 201 for tipo, codigo in resultados if tipo == "reserva")

    async with motor.connect() as conexao:
        sobrepostos = await conexao.scalar(
            text(
                """
                SELECT count(*) FROM agendamentos a JOIN agendamentos b
                  ON a.negocio_id = b.negocio_id AND a.id < b.id
                 AND a.status = 'confirmado' AND b.status = 'confirmado'
                 AND tstzrange(a.inicio, a.fim) && tstzrange(b.inicio, b.fim)
                """
            )
        )
        acumuladores = await conexao.scalar(
            text(
                """
                SELECT count(*) FROM (
                  SELECT negocio_id, telefone_cliente FROM agendamentos
                   WHERE status = 'confirmado' AND fim > now()
                   GROUP BY 1, 2 HAVING count(*) > 3
                ) t
                """
            )
        )
        fora_da_grade = await conexao.scalar(
            text(
                """
                SELECT count(*) FROM agendamentos
                 WHERE extract(minute FROM inicio AT TIME ZONE 'America/Sao_Paulo')::int
                       % 15 <> 0
                """
            )
        )
        inconsistentes = await conexao.scalar(
            text(
                """
                SELECT count(*) FROM agendamentos a JOIN servicos s ON s.id = a.servico_id
                 WHERE s.negocio_id <> a.negocio_id
                    OR a.fim - a.inicio <> make_interval(mins => s.duracao_minutos)
                """
            )
        )
    assert sobrepostos == 0
    assert acumuladores == 0
    assert fora_da_grade == 0
    assert inconsistentes == 0
