from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from hypothesis import given, settings
from hypothesis import strategies as st

from app.disponibilidade import Intervalo, horarios_livres, unir

DIA = date(2026, 11, 9)
FUSO = ZoneInfo("America/Sao_Paulo")
MEIA_NOITE = datetime.combine(DIA, time.min, FUSO).astimezone(UTC)


def forca_bruta(dia, fuso, expediente, duracao, ocupados, passo, nao_antes_de):
    horarios = []
    for abre, fecha in sorted(expediente):
        inicio = datetime.combine(dia, abre, fuso).astimezone(UTC)
        fim = datetime.combine(dia, fecha, fuso).astimezone(UTC)
        while inicio + duracao <= fim:
            candidato = Intervalo(inicio, inicio + duracao)
            if inicio >= nao_antes_de and not any(candidato.sobrepoe(o) for o in ocupados):
                horarios.append(inicio)
            inicio += passo
    return horarios


quartos_de_hora = st.integers(min_value=0, max_value=95)


@st.composite
def faixas_de_expediente(draw):
    primeira, segunda = sorted(draw(st.lists(quartos_de_hora, min_size=2, max_size=2, unique=True)))
    para_hora = lambda q: time(q // 4, (q % 4) * 15)  # noqa: E731
    return para_hora(primeira), para_hora(segunda)


@st.composite
def intervalos_ocupados(draw):
    inicio = draw(st.integers(min_value=-120, max_value=24 * 60))
    duracao = draw(st.integers(min_value=1, max_value=240))
    return Intervalo(
        MEIA_NOITE + timedelta(minutes=inicio), MEIA_NOITE + timedelta(minutes=inicio + duracao)
    )


@settings(max_examples=400, deadline=None)
@given(
    expediente=st.lists(faixas_de_expediente(), min_size=1, max_size=3),
    ocupados=st.lists(intervalos_ocupados(), max_size=12),
    duracao=st.sampled_from([15, 30, 45, 60, 90]),
    passo=st.sampled_from([5, 10, 15, 30]),
    antecedencia=st.integers(min_value=-60, max_value=24 * 60),
)
def test_varredura_bate_com_forca_bruta(expediente, ocupados, duracao, passo, antecedencia):
    argumentos = (
        DIA,
        FUSO,
        expediente,
        timedelta(minutes=duracao),
        ocupados,
        timedelta(minutes=passo),
        MEIA_NOITE + timedelta(minutes=antecedencia),
    )
    assert horarios_livres(*argumentos) == forca_bruta(*argumentos)


@given(st.lists(intervalos_ocupados(), max_size=20))
def test_unir_mantem_a_cobertura_e_deixa_lacunas(intervalos):
    unidos = unir(intervalos)
    for esquerda, direita in zip(unidos, unidos[1:], strict=False):
        assert esquerda.fim < direita.inicio
    for intervalo in intervalos:
        assert any(u.inicio <= intervalo.inicio and intervalo.fim <= u.fim for u in unidos)
