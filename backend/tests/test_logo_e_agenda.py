from app.rotas.calendario import _dobrar
from tests.conftest import cadastrar, em, reservar

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 64


async def enviar(cliente, cabecalhos, dados: bytes, tipo: str = "image/png"):
    return await cliente.put(
        "/negocio/logo", headers={**cabecalhos, "Content-Type": tipo}, content=dados
    )


async def test_dono_envia_uma_foto(cliente, dono):
    resposta = await enviar(cliente, dono, PNG)
    assert resposta.status_code == 200
    versao = resposta.json()["versao_logo"]
    assert versao == 1

    publico = (await cliente.get("/publico/studio-ana")).json()
    assert publico["versao_logo"] == versao

    logo = await cliente.get(f"/publico/studio-ana/logo?v={versao}")
    assert logo.status_code == 200
    assert logo.content == PNG
    assert logo.headers["content-type"] == "image/png"
    assert "immutable" in logo.headers["cache-control"]

    de_novo = await enviar(cliente, dono, WEBP, "image/webp")
    assert de_novo.json()["versao_logo"] == 2
    tipo = (await cliente.get("/publico/studio-ana/logo")).headers["content-type"]
    assert tipo == "image/webp"


async def test_tipo_da_foto_vem_dos_bytes(cliente, dono):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert (await enviar(cliente, dono, svg, "image/png")).status_code == 422
    assert (await enviar(cliente, dono, b"")).status_code == 422
    assert (await enviar(cliente, dono, PNG + b"\x00" * 61 * 1024)).status_code in {413, 422}


async def test_foto_exige_o_dono(cliente, dono):
    assert (await enviar(cliente, {}, PNG)).status_code == 401
    assert (await cliente.get("/publico/studio-ana/logo")).status_code == 404


async def test_remover_a_foto(cliente, dono):
    await enviar(cliente, dono, PNG)
    resposta = await cliente.delete("/negocio/logo", headers=dono)
    assert resposta.json()["versao_logo"] is None
    assert (await cliente.get("/publico/studio-ana/logo")).status_code == 404


async def test_agenda_lista_agendamentos_confirmados(cliente, dono, servico_id, proxima_segunda):
    mantido = (
        await reservar(cliente, servico_id, em(proxima_segunda, 9), nome_cliente="Ana; Lima")
    ).json()
    cancelado = (
        await reservar(cliente, servico_id, em(proxima_segunda, 11), nome_cliente="Bia")
    ).json()
    await cliente.post(f"/gestao/{cancelado['token_gestao']}/cancelar")

    token = (await cliente.get("/negocio", headers=dono)).json()["token_agenda"]
    agenda = await cliente.get(f"/agenda/{token}.ics")
    assert agenda.status_code == 200
    assert agenda.headers["content-type"].startswith("text/calendar")
    corpo = agenda.text
    assert corpo.startswith("BEGIN:VCALENDAR\r\n")
    assert corpo.count("BEGIN:VEVENT") == 1
    assert "Ana\\; Lima" in corpo
    assert f"agendamento-{mantido['id']}@doorway" in corpo


async def test_trocar_o_link_da_agenda(cliente, dono):
    antigo = (await cliente.get("/negocio", headers=dono)).json()["token_agenda"]
    novo = (await cliente.post("/negocio/token-agenda", headers=dono)).json()["token_agenda"]
    assert novo != antigo
    assert (await cliente.get(f"/agenda/{antigo}.ics")).status_code == 404
    assert (await cliente.get(f"/agenda/{novo}.ics")).status_code == 200


async def test_tokens_da_agenda_sao_por_negocio(cliente, dono):
    outro = await cadastrar(cliente, slug="outro", email="outro@example.com")
    meu = (await cliente.get("/negocio", headers=dono)).json()["token_agenda"]
    dele = (await cliente.get("/negocio", headers=outro)).json()["token_agenda"]
    assert meu != dele
    assert (await cliente.get("/agenda/curto.ics")).status_code == 422


def test_linhas_longas_sao_dobradas_sem_partir_caracteres():
    linha = "SUMMARY:" + "ção" * 40
    dobrada = _dobrar(linha)
    assert all(len(parte.encode()) <= 75 for parte in dobrada.split("\r\n"))
    assert dobrada.replace("\r\n ", "") == linha


async def test_contagem_por_dia_soma_so_confirmados(cliente, dono, servico_id, proxima_segunda):
    await reservar(cliente, servico_id, em(proxima_segunda, 9))
    await reservar(cliente, servico_id, em(proxima_segunda, 10), telefone_cliente="11955554444")
    cancelado = await reservar(
        cliente, servico_id, em(proxima_segunda, 11), telefone_cliente="11955553333"
    )
    await cliente.post(f"/gestao/{cancelado.json()['token_gestao']}/cancelar")

    resposta = await cliente.get(
        "/agendamentos/por-dia",
        headers=dono,
        params={"de": proxima_segunda.isoformat(), "quantidade": 3},
    )
    assert resposta.status_code == 200
    assert [d["quantidade"] for d in resposta.json()] == [2, 0, 0]
    assert resposta.json()[0]["data"] == proxima_segunda.isoformat()


async def test_contagem_por_dia_exige_dono_e_limita_periodo(cliente, dono):
    assert (
        await cliente.get("/agendamentos/por-dia", params={"de": "2026-01-01"})
    ).status_code == 401
    longo = await cliente.get(
        "/agendamentos/por-dia", headers=dono, params={"de": "2026-01-01", "quantidade": 500}
    )
    assert longo.status_code == 422
