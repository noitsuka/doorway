import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modelos import Agendamento, Servico
from tests.conftest import em, obter_horarios, reservar


async def test_pagina_publica_do_negocio(cliente, servico_id):
    corpo = (await cliente.get("/publico/studio-ana")).json()
    assert corpo["nome"] == "Studio Ana"
    assert [s["nome"] for s in corpo["servicos"]] == ["Corte"]


async def test_negocio_inexistente(cliente):
    assert (await cliente.get("/publico/ninguem")).status_code == 404


async def test_horarios_seguem_o_expediente(cliente, servico_id, proxima_segunda):
    horarios = await obter_horarios(cliente, servico_id, proxima_segunda)
    assert len(horarios) == 11
    assert horarios[0] == datetime.fromisoformat(em(proxima_segunda, 9))
    assert horarios[-1] == datetime.fromisoformat(em(proxima_segunda, 11, 30))


async def test_dia_fechado_nao_tem_horarios(cliente, servico_id, proxima_segunda):
    assert await obter_horarios(cliente, servico_id, proxima_segunda + timedelta(days=1)) == []


async def test_dias_alem_da_janela_nao_tem_horarios(cliente, servico_id, proxima_segunda):
    assert await obter_horarios(cliente, servico_id, proxima_segunda + timedelta(weeks=20)) == []


async def test_reserva_ocupa_o_horario(cliente, servico_id, proxima_segunda):
    resposta = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), telefone_cliente="+55 11 91234-5678"
    )
    assert resposta.status_code == 201, resposta.text
    corpo = resposta.json()
    assert corpo["status"] == "confirmado"
    duracao = datetime.fromisoformat(corpo["fim"]) - datetime.fromisoformat(corpo["inicio"])
    assert duracao == timedelta(minutes=30)

    horarios = await obter_horarios(cliente, servico_id, proxima_segunda)
    assert datetime.fromisoformat(em(proxima_segunda, 9)) not in horarios
    assert datetime.fromisoformat(em(proxima_segunda, 9, 15)) not in horarios
    assert datetime.fromisoformat(em(proxima_segunda, 9, 30)) in horarios


async def test_reserva_dupla_e_recusada(cliente, servico_id, proxima_segunda):
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 10))).status_code == 201
    resposta = await reservar(cliente, servico_id, em(proxima_segunda, 10, 15), nome_cliente="Duda")
    assert resposta.status_code == 409


async def test_horario_fora_da_grade_e_recusado(cliente, servico_id, proxima_segunda):
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 10, 5))).status_code == 409
    assert (await reservar(cliente, servico_id, em(proxima_segunda, 7))).status_code == 409


async def test_mesmo_instante_em_outro_fuso_e_aceito(cliente, servico_id, proxima_segunda):
    em_utc = datetime.fromisoformat(em(proxima_segunda, 9)).astimezone(ZoneInfo("UTC"))
    assert (await reservar(cliente, servico_id, em_utc.isoformat())).status_code == 201


async def test_cancelar_libera_o_horario(cliente, dono, servico_id, proxima_segunda):
    agendamento = (await reservar(cliente, servico_id, em(proxima_segunda, 11))).json()

    resposta = await cliente.post(f"/agendamentos/{agendamento['id']}/cancelar", headers=dono)
    assert resposta.json()["status"] == "cancelado"
    assert datetime.fromisoformat(em(proxima_segunda, 11)) in await obter_horarios(
        cliente, servico_id, proxima_segunda
    )


async def test_dono_lista_agendamentos(cliente, dono, servico_id, proxima_segunda):
    await reservar(cliente, servico_id, em(proxima_segunda, 11))
    await reservar(cliente, servico_id, em(proxima_segunda, 9))
    periodo = {"inicio": em(proxima_segunda, 0), "fim": em(proxima_segunda + timedelta(days=1), 0)}

    resposta = await cliente.get("/agendamentos", headers=dono, params=periodo)
    assert resposta.status_code == 200
    inicios = [datetime.fromisoformat(a["inicio"]) for a in resposta.json()]
    assert inicios == sorted(inicios) and len(inicios) == 2
    assert resposta.json()[0]["servico"]["nome"] == "Corte"


async def test_telefone_invalido_e_recusado(cliente, servico_id, proxima_segunda):
    resposta = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), telefone_cliente="me liga"
    )
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["msg"] == "Telefone inválido."


@pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)
async def test_banco_recusa_sobreposicao_que_pula_a_api(
    motor, cliente, servico_id, proxima_segunda
):
    await reservar(cliente, servico_id, em(proxima_segunda, 9))

    async with AsyncSession(motor) as sessao:
        servico = await sessao.scalar(select(Servico).where(Servico.id == servico_id))
        inicio = datetime.fromisoformat(em(proxima_segunda, 9, 15))
        sessao.add(
            Agendamento(
                negocio_id=servico.negocio_id,
                servico_id=servico.id,
                nome_cliente="Corrida",
                email_cliente="corrida@example.com",
                inicio=inicio,
                fim=inicio + timedelta(minutes=30),
            )
        )
        with pytest.raises(IntegrityError):
            await sessao.commit()


async def test_email_e_opcional_e_telefone_obrigatorio(cliente, servico_id, proxima_segunda):
    sem_email = await reservar(
        cliente,
        servico_id,
        em(proxima_segunda, 9),
        email_cliente=None,
        telefone_cliente="(11) 91234-5678",
    )
    assert sem_email.status_code == 201, sem_email.text
    assert sem_email.json()["email_cliente"] is None
    assert sem_email.json()["telefone_cliente"] == "11912345678"

    sem_telefone = await reservar(
        cliente, servico_id, em(proxima_segunda, 10), telefone_cliente=None
    )
    assert sem_telefone.status_code == 422
    sem_ddd = await reservar(
        cliente, servico_id, em(proxima_segunda, 10), telefone_cliente="91234-5678"
    )
    assert sem_ddd.status_code == 422


async def test_dono_nao_cancela_atendimento_passado(
    cliente, dono, servico_id, proxima_segunda, motor
):
    agendamento = (await reservar(cliente, servico_id, em(proxima_segunda, 11))).json()
    ontem = datetime.now(ZoneInfo("UTC")) - timedelta(days=1)
    async with AsyncSession(motor) as sessao:
        registro = await sessao.get(Agendamento, agendamento["id"])
        registro.inicio, registro.fim = ontem, ontem + timedelta(minutes=30)
        await sessao.commit()

    resposta = await cliente.post(f"/agendamentos/{agendamento['id']}/cancelar", headers=dono)
    assert resposta.status_code == 409


async def test_dono_nao_cancela_duas_vezes(cliente, dono, servico_id, proxima_segunda):
    agendamento = (await reservar(cliente, servico_id, em(proxima_segunda, 11))).json()
    url = f"/agendamentos/{agendamento['id']}/cancelar"
    assert (await cliente.post(url, headers=dono)).status_code == 200
    assert (await cliente.post(url, headers=dono)).status_code == 409
