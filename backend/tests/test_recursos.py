import asyncio
import os
from datetime import datetime, timedelta

import pytest
from sqlalchemy import func, select

from app import banco
from app.antifraude import gerar_token_formulario
from app.configuracao import obter_configuracao
from app.dados_demo import EXEMPLOS, SLUG_LABORATORIO, recriar_demo
from app.modelos import Agendamento, Negocio
from app.painel_publico import ocultar_email, ocultar_nome, ocultar_telefone
from app.rotas import demo as demo_rotas
from tests.conftest import SP, em, reservar

exige_postgres = pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)


async def test_dono_personaliza_a_pagina_publica(cliente, dono):
    resposta = await cliente.patch(
        "/negocio",
        headers=dono,
        json={"cor_marca": "#0e7c66", "categoria": "Barbearia", "chamada": "Corte e barba"},
    )
    assert resposta.status_code == 200
    publico = (await cliente.get("/publico/studio-ana")).json()
    assert publico["cor_marca"] == "#0e7c66"
    assert publico["categoria"] == "Barbearia"
    assert publico["chamada"] == "Corte e barba"


async def test_marca_e_validada(cliente, dono):
    for dados in ({"cor_marca": "vermelho"}, {"cor_marca": "#12345"}, {"chamada": "a\x00b"}):
        assert (await cliente.patch("/negocio", headers=dono, json=dados)).status_code == 422


async def test_limpar_campos_opcionais_da_marca(cliente, dono):
    await cliente.patch("/negocio", headers=dono, json={"chamada": "Algo"})
    resposta = await cliente.patch("/negocio", headers=dono, json={"chamada": None, "nome": None})
    assert resposta.json()["chamada"] is None
    assert resposta.json()["nome"] == "Studio Ana"


async def test_reserva_devolve_token_de_gestao_longo(cliente, servico_id, proxima_segunda):
    corpo = (await reservar(cliente, servico_id, em(proxima_segunda, 9))).json()
    assert len(corpo["token_gestao"]) >= 40

    gerenciado = await cliente.get(f"/gestao/{corpo['token_gestao']}")
    assert gerenciado.status_code == 200
    assert gerenciado.json()["negocio"]["slug"] == "studio-ana"
    assert "token_gestao" not in gerenciado.json()


async def test_cliente_cancela_pelo_link(cliente, servico_id, proxima_segunda):
    token = (await reservar(cliente, servico_id, em(proxima_segunda, 9))).json()["token_gestao"]

    resposta = await cliente.post(f"/gestao/{token}/cancelar")
    assert resposta.json()["status"] == "cancelado"
    assert (await cliente.post(f"/gestao/{token}/cancelar")).status_code == 409
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 9))).status_code == 201


async def test_cliente_remarca_pelo_link(cliente, servico_id, proxima_segunda):
    token = (await reservar(cliente, servico_id, em(proxima_segunda, 9))).json()["token_gestao"]
    await reservar(cliente, servico_id, em(proxima_segunda, 10), telefone_cliente="11955554444")

    ocupado = await cliente.post(
        f"/gestao/{token}/remarcar", json={"inicio": em(proxima_segunda, 10)}
    )
    assert ocupado.status_code == 409

    movido = await cliente.post(
        f"/gestao/{token}/remarcar", json={"inicio": em(proxima_segunda, 11)}
    )
    assert movido.status_code == 200
    assert datetime.fromisoformat(movido.json()["inicio"]) == datetime.fromisoformat(
        em(proxima_segunda, 11)
    )

    nova = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), telefone_cliente="11955553333"
    )
    assert nova.status_code == 201


async def test_links_de_gestao_resistem_a_chute(cliente):
    assert (await cliente.get("/gestao/1")).status_code == 422
    assert (await cliente.get("/gestao/" + "a" * 43)).status_code == 404
    assert (await cliente.get("/gestao/../../etc/passwd")).status_code in {404, 422}


async def test_login_da_demo_exige_a_conta_demo(cliente, motor):
    assert (await cliente.post("/autenticacao/demo")).status_code == 404

    async with banco.SessaoEscrita() as sessao:
        await recriar_demo(sessao)

    token = (await cliente.post("/autenticacao/demo")).json()["token_acesso"]
    eu = await cliente.get("/autenticacao/eu", headers={"Authorization": f"Bearer {token}"})
    assert eu.json()["email"] == obter_configuracao().email_demo
    assert eu.json()["negocio"]["slug"] == "barbearia-ferraz"


async def test_recriar_demo_e_idempotente_e_realista(cliente, motor):
    async with banco.SessaoEscrita() as sessao:
        await recriar_demo(sessao)
        await recriar_demo(sessao)
        negocios = await sessao.scalar(select(func.count()).select_from(Negocio))
        agendamentos = await sessao.scalar(select(func.count()).select_from(Agendamento))
    assert negocios == len(EXEMPLOS)
    assert agendamentos > 50


async def test_recriacao_agendada_exige_o_segredo(cliente, monkeypatch):
    assert (await cliente.get("/interno/recriar-demo")).status_code == 404
    monkeypatch.setattr(obter_configuracao(), "segredo_cron", "s" * 32)
    errado = await cliente.get("/interno/recriar-demo", headers={"Authorization": "Bearer nao"})
    assert errado.status_code == 404
    certo = await cliente.get(
        "/interno/recriar-demo", headers={"Authorization": f"Bearer {'s' * 32}"}
    )
    assert certo.json() == {"status": "recriada"}


@exige_postgres
async def test_corrida_ao_vivo_aceita_exatamente_um(cliente, motor):
    async with banco.SessaoEscrita() as sessao:
        await recriar_demo(sessao)

    resposta = await cliente.post("/demo/corrida", json={"pedidos": 20})
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["aceitos"] == 1
    assert corpo["recusados"] == 19
    assert len(corpo["tentativas"]) == 20

    async with motor.connect() as conexao:
        laboratorio_id = await conexao.scalar(
            select(Negocio.id).where(Negocio.slug == SLUG_LABORATORIO)
        )
        restantes = await conexao.scalar(
            select(func.count())
            .select_from(Agendamento)
            .where(Agendamento.negocio_id == laboratorio_id)
        )
    assert restantes == 0


async def test_tamanho_da_corrida_e_limitado(cliente):
    assert (await cliente.post("/demo/corrida", json={"pedidos": 500})).status_code == 422


async def _token_da_demo(cliente) -> dict[str, str]:
    async with banco.SessaoEscrita() as sessao:
        await recriar_demo(sessao)
    token = (await cliente.post("/autenticacao/demo")).json()["token_acesso"]
    return {"Authorization": f"Bearer {token}"}


async def _primeiro_horario_livre(cliente, slug: str) -> tuple[int, str]:
    servico_id = (await cliente.get(f"/publico/{slug}")).json()["servicos"][0]["id"]
    hoje = datetime.now(SP).date()
    for adiante in range(1, 15):
        dia = (hoje + timedelta(days=adiante)).isoformat()
        livres = await cliente.get(
            f"/publico/{slug}/horarios-livres", params={"servico_id": servico_id, "dia": dia}
        )
        if livres.json()["horarios"]:
            return servico_id, livres.json()["horarios"][0]
    raise AssertionError("sem horário livre na demo")


def test_contato_e_ocultado_sem_perder_o_formato():
    assert ocultar_email("joao.lima@gmail.com") == "j***@gmail.com"
    assert ocultar_telefone("(85) 99876-5432") == "*********32"
    assert ocultar_nome("João Pereira Lima") == "João L."
    assert ocultar_nome("Madonna") == "Madonna"


async def test_painel_aberto_da_demo_nao_expoe_contato_de_visitante(cliente, motor):
    demo = await _token_da_demo(cliente)
    servico_id, inicio = await _primeiro_horario_livre(cliente, "barbearia-ferraz")
    reserva = await cliente.post(
        "/publico/barbearia-ferraz/agendamentos",
        json={
            "servico_id": servico_id,
            "inicio": inicio,
            "nome_cliente": "João Pereira Lima",
            "email_cliente": "joao.lima@gmail.com",
            "telefone_cliente": "(85) 99876-5432",
            "token_formulario": gerar_token_formulario("barbearia-ferraz"),
        },
    )
    assert reserva.status_code == 201
    corpo = reserva.json()

    momento = datetime.fromisoformat(inicio)
    lista = await cliente.get(
        "/agendamentos",
        headers=demo,
        params={
            "inicio": (momento - timedelta(days=4)).isoformat(),
            "fim": (momento + timedelta(days=1)).isoformat(),
        },
    )
    por_id = {a["id"]: a for a in lista.json()}
    visitante = por_id[corpo["id"]]
    assert visitante["nome_cliente"] == "João L."
    assert visitante["email_cliente"] == "j***@gmail.com"
    assert visitante["telefone_cliente"] == "*********32"
    ficticios = [a for a in por_id.values() if a["id"] != corpo["id"]]
    assert ficticios and all(a["email_cliente"].endswith("@example.com") for a in ficticios)

    cancelado = await cliente.post(f"/agendamentos/{corpo['id']}/cancelar", headers=demo)
    assert cancelado.json()["email_cliente"] == "j***@gmail.com"

    token_agenda = (await cliente.get("/negocio", headers=demo)).json()["token_agenda"]
    agenda = (await cliente.get(f"/agenda/{token_agenda}.ics")).text
    assert "joao.lima@gmail.com" not in agenda and "99876" not in agenda

    proprio = await cliente.get(f"/gestao/{corpo['token_gestao']}")
    assert proprio.json()["email_cliente"] == "joao.lima@gmail.com"


async def test_negocio_comum_ve_o_contato_completo(cliente, dono, servico_id, proxima_segunda):
    segunda = proxima_segunda
    reserva = await reservar(cliente, servico_id, em(segunda, 9), email_cliente="carla@gmail.com")
    assert reserva.status_code == 201
    lista = await cliente.get(
        "/agendamentos",
        headers=dono,
        params={"inicio": em(segunda, 0), "fim": em(segunda + timedelta(days=1), 0)},
    )
    assert lista.json()[0]["email_cliente"] == "carla@gmail.com"


async def test_conta_demo_nao_troca_a_foto_da_pagina_publica(cliente, motor):
    demo = await _token_da_demo(cliente)
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    enviada = await cliente.put(
        "/negocio/logo", headers=demo | {"Content-Type": "image/png"}, content=png
    )
    assert enviada.status_code == 403
    assert (await cliente.delete("/negocio/logo", headers=demo)).status_code == 403
    assert (await cliente.get("/publico/barbearia-ferraz/logo")).status_code == 404


@exige_postgres
async def test_corrida_apaga_as_reservas_mesmo_quando_uma_tentativa_falha(
    cliente, motor, monkeypatch
):
    async with banco.SessaoEscrita() as sessao:
        await recriar_demo(sessao)
    original = demo_rotas.criar_reserva

    async def falha_no_segundo(sessao, servico, **dados):
        if dados["nome_cliente"] == "Pedido 2":
            await asyncio.sleep(0.2)
            raise RuntimeError("falha simulada")
        return await original(sessao, servico, **dados)

    monkeypatch.setattr(demo_rotas, "criar_reserva", falha_no_segundo)
    with pytest.raises(RuntimeError):
        await cliente.post("/demo/corrida", json={"pedidos": 5})

    async with motor.connect() as conexao:
        restantes = await conexao.scalar(
            select(func.count())
            .select_from(Agendamento)
            .join(Negocio)
            .where(Negocio.slug == SLUG_LABORATORIO)
        )
    assert restantes == 0
