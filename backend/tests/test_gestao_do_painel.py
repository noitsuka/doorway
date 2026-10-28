from tests.conftest import cadastrar, em, reservar


async def test_crud_de_servico(cliente, dono):
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Corte", "duracao_minutos": 45, "preco_centavos": 6000},
    )
    assert criado.status_code == 201
    servico_id = criado.json()["id"]

    atualizado = await cliente.patch(
        f"/servicos/{servico_id}", headers=dono, json={"preco_centavos": 7000}
    )
    assert atualizado.json()["preco_centavos"] == 7000
    assert atualizado.json()["duracao_minutos"] == 45

    arquivado = await cliente.patch(f"/servicos/{servico_id}", headers=dono, json={"ativo": False})
    assert arquivado.json()["ativo"] is False

    assert (await cliente.delete(f"/servicos/{servico_id}", headers=dono)).status_code == 204
    assert (await cliente.get("/servicos", headers=dono)).json() == []


async def test_servicos_arquivados_somem_para_o_cliente(cliente, dono):
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Antigo", "duracao_minutos": 30, "preco_centavos": 0},
    )
    await cliente.patch(f"/servicos/{criado.json()['id']}", headers=dono, json={"ativo": False})

    publico = (await cliente.get("/publico/studio-ana")).json()
    assert publico["servicos"] == []


async def test_duracao_do_servico_e_validada(cliente, dono):
    resposta = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Ruim", "duracao_minutos": 0, "preco_centavos": 0},
    )
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["msg"] == "Valor fora do permitido."


async def test_substituir_horarios(cliente, dono):
    semana = [
        {"dia_semana": 0, "abre_as": "14:00", "fecha_as": "18:00"},
        {"dia_semana": 0, "abre_as": "09:00", "fecha_as": "12:00"},
        {"dia_semana": 2, "abre_as": "09:00", "fecha_as": "17:00"},
    ]
    resposta = await cliente.put("/horarios", headers=dono, json=semana)
    assert resposta.status_code == 200
    assert [(h["dia_semana"], h["abre_as"]) for h in resposta.json()] == [
        (0, "09:00:00"),
        (0, "14:00:00"),
        (2, "09:00:00"),
    ]

    resposta = await cliente.put("/horarios", headers=dono, json=semana[:1])
    assert len(resposta.json()) == 1


async def test_horarios_sobrepostos_sao_recusados(cliente, dono):
    semana = [
        {"dia_semana": 1, "abre_as": "09:00", "fecha_as": "13:00"},
        {"dia_semana": 1, "abre_as": "12:00", "fecha_as": "18:00"},
    ]
    resposta = await cliente.put("/horarios", headers=dono, json=semana)
    assert resposta.status_code == 422


async def test_intervalo_invertido_e_recusado(cliente, dono):
    semana = [{"dia_semana": 1, "abre_as": "18:00", "fecha_as": "09:00"}]
    resposta = await cliente.put("/horarios", headers=dono, json=semana)
    assert resposta.status_code == 422
    assert (
        resposta.json()["detail"][0]["msg"]
        == "O horário de abertura precisa ser antes do fechamento."
    )


async def test_servico_com_agendamentos_nao_pode_ser_excluido(
    cliente, dono, servico_id, proxima_segunda
):
    await reservar(cliente, servico_id, em(proxima_segunda, 9))
    resposta = await cliente.delete(f"/servicos/{servico_id}", headers=dono)
    assert resposta.status_code == 409
    assert resposta.json()["detail"].startswith("Esse serviço já tem agendamentos")
    assert len((await cliente.get("/servicos", headers=dono)).json()) == 1


async def test_so_o_dono_exclui_um_servico(cliente, dono, servico_id):
    outro = await cadastrar(cliente, slug="outro", email="outro@example.com")
    assert (await cliente.delete(f"/servicos/{servico_id}", headers=outro)).status_code == 404
    assert (await cliente.delete(f"/servicos/{servico_id}", headers=dono)).status_code == 204
