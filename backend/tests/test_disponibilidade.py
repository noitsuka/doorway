from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.disponibilidade import Intervalo, horarios_livres

SP = ZoneInfo("America/Sao_Paulo")
DIA = date(2026, 11, 9)
HA_MUITO_TEMPO = datetime(2000, 1, 1, tzinfo=UTC)


def local(hora: int, minuto: int = 0, fuso: ZoneInfo = SP, dia: date = DIA) -> datetime:
    return datetime.combine(dia, time(hora, minuto), fuso)


def livres(**alteracoes):
    parametros = {
        "dia": DIA,
        "fuso": SP,
        "expediente": [(time(9), time(11))],
        "duracao": timedelta(minutes=30),
        "ocupados": [],
        "passo": timedelta(minutes=30),
        "nao_antes_de": HA_MUITO_TEMPO,
    } | alteracoes
    return horarios_livres(**parametros)


def test_preenche_o_expediente_em_passos():
    assert livres() == [local(9), local(9, 30), local(10), local(10, 30)]


def test_ultimo_horario_termina_antes_de_fechar():
    assert livres(duracao=timedelta(minutes=45))[-1] == local(10)


def test_pula_horarios_que_colidem_com_ocupados():
    ocupados = [Intervalo(local(9, 30), local(10, 15))]
    assert livres(ocupados=ocupados) == [local(9), local(10, 30)]


def test_agendamentos_colados_nao_conflitam():
    ocupados = [Intervalo(local(9), local(9, 30))]
    assert local(9, 30) in livres(ocupados=ocupados)


def test_respeita_a_antecedencia():
    assert livres(nao_antes_de=local(10)) == [local(10), local(10, 30)]


def test_varias_faixas_deixam_um_intervalo():
    resultado = livres(expediente=[(time(14), time(15)), (time(9), time(10))])
    assert resultado == [local(9), local(9, 30), local(14), local(14, 30)]


def test_resultados_em_utc():
    assert all(h.tzinfo is UTC for h in livres())


def test_inicio_do_horario_de_verao_nao_cria_horario_fantasma():
    nova_york = ZoneInfo("America/New_York")
    dia = date(2026, 3, 8)
    resultado = livres(
        dia=dia,
        fuso=nova_york,
        expediente=[(time(0), time(4))],
        duracao=timedelta(hours=1),
        passo=timedelta(hours=1),
    )
    assert [h.astimezone(nova_york).hour for h in resultado] == [0, 1, 3]
