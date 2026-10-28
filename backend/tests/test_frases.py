from datetime import date, time, timedelta

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.frases import entender, frases_candidatas
from tests.conftest import em, reservar

SEGUNDA = date(2026, 10, 19)


@pytest.mark.parametrize(
    ("frase", "dias", "depois", "antes", "perto"),
    [
        ("sexta à tarde", [date(2026, 10, 23)], time(12), time(18), None),
        ("amanhã depois das 18h", [date(2026, 10, 20)], time(18), None, None),
        (
            "terça ou quinta de manhã",
            [date(2026, 10, 20), date(2026, 10, 22)],
            None,
            time(12),
            None,
        ),
        ("sábado às 10", [date(2026, 10, 24)], None, None, time(10)),
        ("hoje 15h30", [SEGUNDA], None, None, time(15, 30)),
        ("dia 25", [date(2026, 10, 25)], None, None, None),
        ("dia 5", [date(2026, 11, 5)], None, None, None),
        ("25/10 de manhã", [date(2026, 10, 25)], None, time(12), None),
        ("02/01", [date(2027, 1, 2)], None, None, None),
        ("fim de semana", [date(2026, 10, 24), date(2026, 10, 25)], None, None, None),
        ("segunda", [SEGUNDA], None, None, None),
        ("próxima segunda", [date(2026, 10, 26)], None, None, None),
        ("depois de amanhã à noite", [date(2026, 10, 21)], time(18), None, None),
        ("QUARTA, depois das 5 da tarde", [date(2026, 10, 21)], time(17), None, None),
        ("9 da noite", None, None, None, time(21)),
        ("às 3", None, None, None, time(15)),
        ("entre 14 e 16h30", None, time(14), time(16, 30), None),
        ("antes das 10", None, None, time(10), None),
    ],
)
def test_entende_frases_comuns(frase, dias, depois, antes, perto):
    desejo = entender(frase, SEGUNDA)
    assert desejo is not None
    if dias is not None:
        assert list(desejo.dias) == dias
    else:
        assert desejo.dias[0] == SEGUNDA and len(desejo.dias) == 14
    assert (desejo.depois, desejo.antes, desejo.perto) == (depois, antes, perto)


def test_semana_que_vem_vai_de_segunda_a_domingo():
    desejo = entender("semana que vem", SEGUNDA)
    assert desejo.dias == tuple(date(2026, 10, 26) + timedelta(days=i) for i in range(7))


@pytest.mark.parametrize("frase", ["", "   ", "oi", "quero cortar o cabelo", "31/02", "dia 31 a"])
def test_avisa_quando_nao_entendeu(frase):
    desejo = entender(frase, SEGUNDA)
    assert desejo is None or not desejo.dias or desejo.rotulo_dia


def test_rotulos_sao_para_pessoas():
    desejo = entender("terça ou quinta depois das 18h", SEGUNDA)
    assert desejo.rotulo_dia == "terça, 20/10 ou quinta, 22/10"
    assert desejo.rotulo_horario == "a partir das 18h"


@given(st.text(max_size=80), st.dates(min_value=date(2000, 1, 1), max_value=date(2099, 12, 1)))
def test_nunca_quebra_e_nunca_olha_para_tras(frase, hoje):
    desejo = entender(frase, hoje)
    if desejo is None:
        return
    assert all(dia >= hoje for dia in desejo.dias)
    assert list(desejo.dias) == sorted(set(desejo.dias))
    if desejo.depois and desejo.antes:
        assert desejo.depois < desejo.antes


async def test_busca_devolve_horarios_livres_compativeis(cliente, servico_id, proxima_segunda):
    await reservar(cliente, servico_id, em(proxima_segunda, 10))
    resposta = await cliente.get(
        "/publico/studio-ana/busca",
        params={"servico_id": servico_id, "frase": "próxima segunda depois das 9h30"},
    )
    corpo = resposta.json()
    assert corpo["entendido"] is True
    inicios = [h[11:16] for h in corpo["horarios"]]
    assert inicios and all(h >= "09:30" for h in inicios)
    assert "10:00" not in inicios and "10:15" not in inicios


async def test_busca_avisa_quando_a_frase_e_vaga(cliente, servico_id):
    resposta = await cliente.get(
        "/publico/studio-ana/busca", params={"servico_id": servico_id, "frase": "oi tudo bem"}
    )
    assert resposta.json() == {
        "entendido": False,
        "rotulo_dia": None,
        "rotulo_horario": None,
        "horarios": [],
    }


async def test_busca_valida_a_entrada(cliente, servico_id):
    rota = "/publico/studio-ana/busca"
    longa = await cliente.get(rota, params={"servico_id": servico_id, "frase": "x" * 81})
    assert longa.status_code == 422
    inexistente = await cliente.get(rota, params={"servico_id": 999, "frase": "sexta"})
    assert inexistente.status_code == 404


@pytest.mark.parametrize(
    ("frase", "perto"),
    [("hoje 9h", time(9)), ("sexta 18 horas", time(18)), ("9 hoje", None)],
)
def test_sufixos_de_hora(frase, perto):
    assert entender(frase, SEGUNDA).perto == perto


@pytest.mark.parametrize("deslocamento", range(14))
def test_frases_sugeridas_apontam_para_o_proprio_dia(deslocamento):
    hoje = date(2026, 10, 26) + timedelta(days=deslocamento)
    for dia, frase in frases_candidatas(hoje):
        desejo = entender(frase, hoje)
        assert desejo is not None and desejo.dias == (dia,), frase
        assert desejo.rotulo_horario is not None, frase
