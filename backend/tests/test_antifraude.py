import time
from datetime import timedelta

import pytest

from app.antifraude import (
    CLIENTE_BLOQUEADO,
    FORMULARIO_INVALIDO,
    LIMITE_DA_CONEXAO,
    VALIDADE_FORMULARIO_SEGUNDOS,
    gerar_token_formulario,
)
from app.configuracao import obter_configuracao
from tests.conftest import cadastrar, em, reservar


@pytest.fixture
def configuracao(monkeypatch):
    def ajustar(**valores):
        for campo, valor in valores.items():
            monkeypatch.setattr(obter_configuracao(), campo, valor)

    return ajustar


async def test_pagina_publica_entrega_token_do_formulario(cliente, servico_id):
    corpo = (await cliente.get("/publico/studio-ana")).json()
    momento, _, assinatura = corpo["token_formulario"].partition(".")
    assert momento.isdigit() and len(assinatura) == 24


@pytest.mark.parametrize(
    "extra",
    [
        {"token_formulario": None},
        {"token_formulario": "123.abc"},
        {"token_formulario": gerar_token_formulario("outro-negocio")},
        {"site": "https://spam.example"},
    ],
)
async def test_reserva_sem_formulario_valido_e_recusada(
    cliente, servico_id, proxima_segunda, extra
):
    resposta = await reservar(cliente, servico_id, em(proxima_segunda, 9), **extra)
    assert resposta.status_code == 400
    assert resposta.json()["detail"] == FORMULARIO_INVALIDO


async def test_formulario_enviado_rapido_ou_velho_demais_e_recusado(
    cliente, servico_id, proxima_segunda, configuracao
):
    configuracao(segundos_minimos_formulario=3)
    agora = time.time()
    rapido = gerar_token_formulario("studio-ana", agora)
    velho = gerar_token_formulario("studio-ana", agora - VALIDADE_FORMULARIO_SEGUNDOS - 1)
    for token in (rapido, velho):
        resposta = await reservar(
            cliente, servico_id, em(proxima_segunda, 9), token_formulario=token
        )
        assert resposta.status_code == 400

    a_tempo = gerar_token_formulario("studio-ana", agora - 5)
    resposta = await reservar(cliente, servico_id, em(proxima_segunda, 9), token_formulario=a_tempo)
    assert resposta.status_code == 201


async def test_email_temporario_e_recusado(cliente, servico_id, proxima_segunda):
    resposta = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), email_cliente="teste@mailinator.com"
    )
    assert resposta.status_code == 422
    (erro,) = resposta.json()["detail"]
    assert erro["loc"][-1] == "email_cliente"
    assert "temporários" in erro["msg"]


@pytest.mark.parametrize("nome", ["!!", "a1", "  x  "])
async def test_nome_sem_letras_suficientes_e_recusado(cliente, servico_id, proxima_segunda, nome):
    resposta = await reservar(cliente, servico_id, em(proxima_segunda, 9), nome_cliente=nome)
    assert resposta.status_code == 422


async def test_mesma_conexao_tem_limite_de_reservas_futuras(
    cliente, servico_id, proxima_segunda, configuracao
):
    configuracao(maximo_reservas_futuras_por_ip=2)
    for indice, hora in enumerate((9, 10)):
        resposta = await reservar(
            cliente, servico_id, em(proxima_segunda, hora), telefone_cliente=f"1190000000{indice}"
        )
        assert resposta.status_code == 201
    excedente = await reservar(
        cliente, servico_id, em(proxima_segunda, 11), telefone_cliente="11955554444"
    )
    assert excedente.status_code == 409
    assert excedente.json()["detail"] == LIMITE_DA_CONEXAO


async def test_dono_bloqueia_cliente_e_cancela_reservas_futuras(
    cliente, dono, servico_id, proxima_segunda
):
    primeira = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), telefone_cliente="(11) 91234-5678"
    )
    await reservar(cliente, servico_id, em(proxima_segunda, 10))

    bloqueio = await cliente.post(
        "/bloqueios", headers=dono, json={"agendamento_id": primeira.json()["id"]}
    )
    assert bloqueio.status_code == 201
    assert bloqueio.json()["cancelados"] == 2
    assert bloqueio.json()["bloqueio"]["telefone"] == "11912345678"

    mesmo_email = await reservar(cliente, servico_id, em(proxima_segunda, 11))
    mesmo_telefone = await reservar(
        cliente,
        servico_id,
        em(proxima_segunda, 11),
        email_cliente="nova@example.com",
        telefone_cliente="11 91234 5678",
    )
    for resposta in (mesmo_email, mesmo_telefone):
        assert resposta.status_code == 403
        assert resposta.json()["detail"] == CLIENTE_BLOQUEADO

    lista = (await cliente.get("/bloqueios", headers=dono)).json()
    assert [b["email"] for b in lista] == ["carla@example.com"]

    removido = await cliente.delete(f"/bloqueios/{lista[0]['id']}", headers=dono)
    assert removido.status_code == 204
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 11))).status_code == 201


async def test_bloqueio_vale_so_para_o_proprio_negocio(cliente, dono, servico_id, proxima_segunda):
    reserva = await reservar(cliente, servico_id, em(proxima_segunda, 9))
    outro = await cadastrar(cliente, slug="outro-lugar", email="outro@example.com")

    alheio = await cliente.post(
        "/bloqueios", headers=outro, json={"agendamento_id": reserva.json()["id"]}
    )
    assert alheio.status_code == 404
    assert (await cliente.get("/bloqueios", headers=outro)).json() == []
    assert (await cliente.delete("/bloqueios/1", headers=outro)).status_code == 404
    assert (await cliente.get("/bloqueios")).status_code == 401


async def test_dias_livres_mostram_quantos_horarios_cada_dia_tem(
    cliente, servico_id, proxima_segunda
):
    await reservar(cliente, servico_id, em(proxima_segunda, 9))
    resposta = await cliente.get(
        "/publico/studio-ana/dias",
        params={"servico_id": servico_id, "de": proxima_segunda.isoformat(), "quantidade": 8},
    )
    dias = {d["data"]: d["livres"] for d in resposta.json()["dias"]}
    assert len(dias) == 8
    assert dias[proxima_segunda.isoformat()] == 9
    assert dias[(proxima_segunda + timedelta(days=1)).isoformat()] == 0
    assert dias[(proxima_segunda + timedelta(days=7)).isoformat()] == 11


async def test_dias_livres_limitam_o_periodo(cliente, servico_id, proxima_segunda):
    longe = proxima_segunda + timedelta(days=400)
    resposta = await cliente.get(
        "/publico/studio-ana/dias",
        params={"servico_id": servico_id, "de": longe.isoformat(), "quantidade": 3},
    )
    assert [d["livres"] for d in resposta.json()["dias"]] == [0, 0, 0]
    excessivo = await cliente.get(
        "/publico/studio-ana/dias",
        params={"servico_id": servico_id, "de": proxima_segunda.isoformat(), "quantidade": 90},
    )
    assert excessivo.status_code == 422
