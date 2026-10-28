import asyncio
import json
import os

import jwt
import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.antifraude import gerar_token_formulario
from tests.conftest import cadastrar, em, reservar

exige_postgres = pytest.mark.skipif(
    not os.environ["DATABASE_URL"].startswith("postgresql"), reason="exige PostgreSQL"
)

TEXTOS_HOSTIS = [
    "a\x00b",
    "\ud800",
    "quebra\nde linha",
    "‮maligno",
    "<script>alert(1)</script>",
    "'; DROP TABLE usuarios; --",
    "a" * 10_000,
    "",
    "   ",
]


async def post_bruto(cliente, caminho, dados, cabecalhos=None):
    return await cliente.post(
        caminho,
        content=json.dumps(dados),
        headers={**(cabecalhos or {}), "Content-Type": "application/json"},
    )


@pytest.mark.parametrize("valor", TEXTOS_HOSTIS)
async def test_nomes_de_cliente_hostis_nunca_quebram(cliente, servico_id, proxima_segunda, valor):
    dados = {
        "servico_id": servico_id,
        "inicio": em(proxima_segunda, 9),
        "nome_cliente": valor,
        "email_cliente": "carla@example.com",
        "token_formulario": gerar_token_formulario("studio-ana"),
    }
    resposta = await post_bruto(cliente, "/publico/studio-ana/agendamentos", dados)
    assert resposta.status_code < 500, resposta.text


@pytest.mark.parametrize("valor", TEXTOS_HOSTIS)
async def test_nomes_de_servico_hostis_nunca_quebram(cliente, dono, valor):
    dados = {"nome": valor, "duracao_minutos": 30, "preco_centavos": 0}
    resposta = await post_bruto(cliente, "/servicos", dados, dono)
    assert resposta.status_code < 500, resposta.text


@pytest.mark.parametrize("senha", ["\ud800\ud800\ud800\ud800", "sen\x00ha-123"])
async def test_senhas_hostis_nunca_quebram(cliente, senha):
    dados = {
        "nome_negocio": "X",
        "slug": "xyz",
        "nome": "X",
        "email": "x@example.com",
        "senha": senha,
    }
    assert (await post_bruto(cliente, "/autenticacao/cadastro", dados)).status_code < 500
    login = {"email": "x@example.com", "senha": senha}
    assert (await post_bruto(cliente, "/autenticacao/login", login)).status_code < 500


@pytest.mark.parametrize("slug", ["a%00b", "%ff%fe", "x" * 5000, "..%2F..%2Fetc", "%E2%80%AE"])
async def test_slugs_hostis_nunca_quebram(cliente, slug):
    caminhos = (
        f"/publico/{slug}",
        f"/publico/{slug}/horarios-livres?servico_id=1&dia=2026-11-09",
    )
    for caminho in caminhos:
        assert (await cliente.get(caminho)).status_code < 500


@pytest.mark.parametrize("telefone", ["--------", "(((((((())", "+ + + + + +"])
async def test_telefone_exige_digitos_de_verdade(cliente, servico_id, proxima_segunda, telefone):
    resposta = await reservar(
        cliente, servico_id, em(proxima_segunda, 9), telefone_cliente=telefone
    )
    assert resposta.status_code == 422


async def test_listagem_com_datas_extremas_nunca_quebra(cliente, dono):
    periodo = {"inicio": "0001-01-01T00:00:00+14:00", "fim": "0001-01-02T00:00:00+14:00"}
    resposta = await cliente.get("/agendamentos", headers=dono, params=periodo)
    assert resposta.status_code < 500


async def test_json_profundamente_aninhado_nunca_quebra(cliente, dono):
    corpo = "[" * 50_000 + "]" * 50_000
    resposta = await cliente.post(
        "/servicos", headers={**dono, "Content-Type": "application/json"}, content=corpo
    )
    assert resposta.status_code < 500


async def test_json_malformado_e_tipos_errados(cliente, dono):
    cabecalhos = {**dono, "Content-Type": "application/json"}
    for corpo in ("{", "null", "[]", '"texto"', "1e999999", '{"nome": {"$gt": ""}}'):
        resposta = await cliente.post("/servicos", headers=cabecalhos, content=corpo)
        assert resposta.status_code == 422, (corpo, resposta.status_code)


async def test_corpo_grande_demais_e_recusado(cliente, dono):
    corpo = json.dumps(
        {"nome": "x", "duracao_minutos": 30, "preco_centavos": 0, "enchimento": "x" * 2_000_000}
    )
    resposta = await cliente.post(
        "/servicos", headers={**dono, "Content-Type": "application/json"}, content=corpo
    )
    assert resposta.status_code == 413


async def test_algoritmo_none_e_tokens_lixo(cliente, dono):
    sem_assinatura = jwt.encode({"sub": "1", "exp": 9999999999}, key="", algorithm="none")
    for cabecalho in (
        f"Bearer {sem_assinatura}",
        "Bearer",
        "Bearer ",
        "Basic dXNlcjpwYXNz",
        "Bearer " + "a" * 10_000,
        "Bearer a.b.c",
    ):
        resposta = await cliente.get("/autenticacao/eu", headers={"Authorization": cabecalho})
        assert resposta.status_code == 401, cabecalho


async def test_maiusculas_no_email_nao_criam_duplicatas(cliente, dono):
    resposta = await cliente.post(
        "/autenticacao/cadastro",
        json={
            "nome_negocio": "Clone",
            "slug": "clone",
            "nome": "Ana",
            "email": "ANA@EXAMPLE.COM",
            "senha": "s3nha-secreta",
        },
    )
    assert resposta.status_code == 409


@pytest.mark.parametrize("slug", ["login", "cadastro", "painel", "entrar", "api", "admin"])
async def test_slugs_reservados_sao_recusados(cliente, slug):
    resposta = await cliente.post(
        "/autenticacao/cadastro",
        json={
            "nome_negocio": "X",
            "slug": slug,
            "nome": "X",
            "email": f"{slug}@example.com",
            "senha": "s3nha-secreta",
        },
    )
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["msg"] == "Esse link é reservado."


async def test_um_cliente_nao_pode_lotar_a_agenda(cliente, servico_id, proxima_segunda):
    codigos = [
        (
            await reservar(cliente, servico_id, em(proxima_segunda, 9 + i // 2, 30 * (i % 2)))
        ).status_code
        for i in range(5)
    ]
    assert codigos[:3] == [201, 201, 201]
    assert 409 in codigos[3:]


valores_json = st.recursive(
    st.none()
    | st.booleans()
    | st.integers()
    | st.floats(allow_nan=False, allow_infinity=False)
    | st.text(max_size=40),
    lambda filhos: (
        st.lists(filhos, max_size=4) | st.dictionaries(st.text(max_size=10), filhos, max_size=4)
    ),
    max_leaves=12,
)
parecido_com_reserva = st.fixed_dictionaries(
    {},
    optional={
        "servico_id": valores_json | st.integers(),
        "inicio": valores_json | st.datetimes().map(lambda d: d.isoformat() + "Z"),
        "nome_cliente": valores_json,
        "email_cliente": valores_json | st.emails(),
        "telefone_cliente": valores_json,
    },
)


@settings(
    max_examples=150, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(dados=parecido_com_reserva)
async def test_reservas_aleatorias_nunca_quebram(cliente, servico_id, dados):
    resposta = await cliente.post("/publico/studio-ana/agendamentos", json=dados)
    assert resposta.status_code < 500, (dados, resposta.text)


@settings(
    max_examples=150, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(dados=valores_json)
async def test_corpos_aleatorios_nas_rotas_do_dono_nunca_quebram(cliente, dono, dados):
    for metodo, caminho in (
        ("POST", "/servicos"),
        ("PUT", "/horarios"),
        ("POST", "/autenticacao/cadastro"),
        ("POST", "/autenticacao/login"),
    ):
        resposta = await cliente.request(metodo, caminho, headers=dono, json=dados)
        assert resposta.status_code < 500, (metodo, caminho, dados, resposta.text)


@settings(
    max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@given(dia=st.text(max_size=20), servico=st.text(max_size=20))
async def test_consultas_de_horarios_aleatorias_nunca_quebram(cliente, servico_id, dia, servico):
    resposta = await cliente.get(
        "/publico/studio-ana/horarios-livres", params={"servico_id": servico, "dia": dia}
    )
    assert resposta.status_code < 500


@exige_postgres
async def test_cadastros_simultaneos_com_o_mesmo_slug(cliente):
    async def cadastrar_concorrente(i):
        return await cliente.post(
            "/autenticacao/cadastro",
            json={
                "nome_negocio": "Corrida",
                "slug": "corrida",
                "nome": "R",
                "email": f"r{i}@example.com",
                "senha": "s3nha-secreta",
            },
        )

    respostas = await asyncio.gather(*(cadastrar_concorrente(i) for i in range(10)))
    codigos = [r.status_code for r in respostas]
    assert codigos.count(201) == 1
    assert codigos.count(409) == 9


async def test_ajudante_de_cadastro_continua_funcionando(cliente):
    await cadastrar(cliente, slug="conferencia", email="ajudante@example.com")
