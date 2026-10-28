from datetime import datetime, timedelta

from tests.conftest import cadastrar, em, reservar


async def sugestoes(cliente, servico_id, slug="studio-ana"):
    resposta = await cliente.get(f"/publico/{slug}/sugestoes", params={"servico_id": servico_id})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()["sugestoes"]


async def test_toda_sugestao_encontra_horario_na_busca(cliente, servico_id):
    frases = await sugestoes(cliente, servico_id)
    assert frases
    assert all("manhã" in f for f in frases)
    for frase in frases:
        busca = await cliente.get(
            "/publico/studio-ana/busca", params={"servico_id": servico_id, "frase": frase}
        )
        assert busca.json()["horarios"], frase


async def test_dia_lotado_some_das_sugestoes(cliente, servico_id, proxima_segunda):
    antes = await sugestoes(cliente, servico_id)
    for indice in range(6):
        inicio = datetime.fromisoformat(em(proxima_segunda, 9)) + timedelta(minutes=30 * indice)
        await reservar(
            cliente, servico_id, inicio.isoformat(), telefone_cliente=f"1190000000{indice}"
        )
    depois = await sugestoes(cliente, servico_id)
    assert len(depois) <= len(antes)
    for frase in depois:
        busca = await cliente.get(
            "/publico/studio-ana/busca", params={"servico_id": servico_id, "frase": frase}
        )
        assert busca.json()["horarios"], frase


async def test_negocio_sem_expediente_nao_sugere_nada(cliente):
    dono = await cadastrar(cliente, slug="fechado-sempre", email="fechado@example.com")
    criado = await cliente.post(
        "/servicos",
        headers=dono,
        json={"nome": "Corte", "duracao_minutos": 30, "preco_centavos": 100},
    )
    assert await sugestoes(cliente, criado.json()["id"], "fechado-sempre") == []


async def test_sugestoes_de_servico_inexistente(cliente, servico_id):
    resposta = await cliente.get("/publico/studio-ana/sugestoes", params={"servico_id": 999})
    assert resposta.status_code == 404
