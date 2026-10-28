from tests.conftest import cadastrar


async def test_cadastro_e_usuario_atual(cliente, dono):
    resposta = await cliente.get("/autenticacao/eu", headers=dono)
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["email"] == "ana@example.com"
    assert corpo["negocio"]["slug"] == "studio-ana"


async def test_login(cliente, dono):
    resposta = await cliente.post(
        "/autenticacao/login", json={"email": "ANA@example.com", "senha": "s3nha-secreta"}
    )
    assert resposta.status_code == 200
    assert resposta.json()["token_acesso"]


async def test_login_com_senha_errada(cliente, dono):
    resposta = await cliente.post(
        "/autenticacao/login", json={"email": "ana@example.com", "senha": "senha-errada"}
    )
    assert resposta.status_code == 401


async def test_slug_repetido_e_recusado(cliente, dono):
    resposta = await cliente.post(
        "/autenticacao/cadastro",
        json={
            "nome_negocio": "Outro",
            "slug": "studio-ana",
            "nome": "Bia",
            "email": "bia@example.com",
            "senha": "s3nha-secreta",
        },
    )
    assert resposta.status_code == 409


async def test_fuso_invalido_e_recusado(cliente):
    resposta = await cliente.post(
        "/autenticacao/cadastro",
        json={
            "nome_negocio": "Outro",
            "slug": "outro",
            "fuso_horario": "Marte/Olimpo",
            "nome": "Bia",
            "email": "bia@example.com",
            "senha": "s3nha-secreta",
        },
    )
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["msg"] == "Fuso horário desconhecido."


async def test_rotas_protegidas_exigem_token(cliente):
    assert (await cliente.get("/autenticacao/eu")).status_code == 401
    invalido = {"Authorization": "Bearer nao-e-um-token"}
    assert (await cliente.get("/servicos", headers=invalido)).status_code == 401


async def test_negocios_ficam_isolados(cliente, dono):
    outro = await cadastrar(cliente, slug="barbearia-joao", email="joao@example.com")
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Corte", "duracao_minutos": 30, "preco_centavos": 0},
    )
    servico_id = criado.json()["id"]

    assert (await cliente.get("/servicos", headers=outro)).json() == []
    resposta = await cliente.patch(f"/servicos/{servico_id}", headers=outro, json={"nome": "Meu"})
    assert resposta.status_code == 404
