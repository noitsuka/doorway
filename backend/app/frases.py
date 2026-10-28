import re
import unicodedata
from dataclasses import dataclass
from datetime import date, time, timedelta

DIAS_SEMANA = {
    "segunda": 0,
    "terca": 1,
    "quarta": 2,
    "quinta": 3,
    "sexta": 4,
    "sabado": 5,
    "domingo": 6,
}
NOMES_DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]

PERIODOS = {
    "cedo": (None, time(10), "bem cedo"),
    "manha": (None, time(12), "de manhã"),
    "almoco": (time(11, 30), time(14), "na hora do almoço"),
    "tarde": (time(12), time(18), "à tarde"),
    "noite": (time(18), None, "à noite"),
}

HORA = (
    r"(\d{1,2})(?:\s*(?:h|:)\s*(\d{2}))?"
    r"(?:\s*(?:horas?|hs|h)\b)?"
    r"(?:\s+da\s+(manha|tarde|noite))?"
)


@dataclass(frozen=True, slots=True)
class Desejo:
    dias: tuple[date, ...]
    depois: time | None = None
    antes: time | None = None
    perto: time | None = None
    rotulo_dia: str | None = None
    rotulo_horario: str | None = None


def normalizar(texto: str) -> str:
    simples = unicodedata.normalize("NFKD", texto.lower())
    simples = "".join(c for c in simples if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9:/ ]", " ", simples)).strip()


def _hora(horas: str, minutos: str | None, periodo: str | None) -> time | None:
    h, m = int(horas), int(minutos or 0)
    if (periodo in {"tarde", "noite"} and h < 12) or (not periodo and 1 <= h <= 5):
        h += 12
    if h > 23 or m > 59:
        return None
    return time(h, m)


def _relogio(valor: time) -> str:
    return f"{valor.hour}h" if not valor.minute else f"{valor.hour}h{valor.minute:02d}"


def _proximo(hoje: date, dia_semana: int, pular_hoje: bool) -> date:
    adiante = (dia_semana - hoje.weekday()) % 7
    if adiante == 0 and pular_hoje:
        adiante = 7
    return hoje + timedelta(days=adiante)


def _curto(dia: date) -> str:
    return f"{NOMES_DIAS[dia.weekday()]}, {dia.day:02d}/{dia.month:02d}"


def _dias(texto: str, hoje: date, horizonte: int) -> tuple[list[date], str | None]:
    if "depois de amanha" in texto:
        dia = hoje + timedelta(days=2)
        return [dia], _curto(dia)
    if re.search(r"\bamanha\b", texto):
        dia = hoje + timedelta(days=1)
        return [dia], f"amanhã, {dia.day:02d}/{dia.month:02d}"
    if re.search(r"\bhoje\b", texto):
        return [hoje], "hoje"

    achado = re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", texto)
    if achado:
        d, m = int(achado[1]), int(achado[2])
        ano = int(achado[3]) if achado[3] else hoje.year
        ano += 2000 if ano < 100 else 0
        try:
            dia = date(ano, m, d)
            if not achado[3] and dia < hoje:
                dia = date(ano + 1, m, d)
        except ValueError:
            return [], None
        return [dia], _curto(dia)

    achado = re.search(r"\bdia (\d{1,2})\b", texto)
    if achado:
        d = int(achado[1])
        for meses in range(3):
            mes = (hoje.month - 1 + meses) % 12 + 1
            ano = hoje.year + (hoje.month - 1 + meses) // 12
            try:
                dia = date(ano, mes, d)
            except ValueError:
                continue
            if dia >= hoje:
                return [dia], _curto(dia)
        return [], None

    if "fim de semana" in texto or "final de semana" in texto:
        sabado = _proximo(hoje, 5, pular_hoje=False)
        dias = [sabado, sabado + timedelta(days=1)]
        if hoje.weekday() == 6:
            dias = [hoje]
        return dias, "no fim de semana"

    semana_que_vem = bool(re.search(r"\b(semana que vem|proxima semana)\b", texto))
    citados = [DIAS_SEMANA[d] for d in re.findall(r"\b(" + "|".join(DIAS_SEMANA) + r")\b", texto)]
    if citados:
        pular = semana_que_vem or bool(re.search(r"\b(proxima|proximo|que vem)\b", texto))
        dias = sorted({_proximo(hoje, d, pular) for d in dict.fromkeys(citados)})
        if semana_que_vem:
            segunda = hoje + timedelta(days=7 - hoje.weekday())
            dias = sorted({segunda + timedelta(days=d) for d in citados})
        return dias, " ou ".join(_curto(d) for d in dias)
    if semana_que_vem:
        segunda = hoje + timedelta(days=7 - hoje.weekday())
        return [segunda + timedelta(days=i) for i in range(7)], "na semana que vem"
    if re.search(r"\b(esta|essa) semana\b", texto):
        return [hoje + timedelta(days=i) for i in range(7 - hoje.weekday())], "nesta semana"

    return [hoje + timedelta(days=i) for i in range(horizonte)], None


def _horarios(texto: str) -> tuple[time | None, time | None, time | None, str | None]:
    achado = re.search(rf"\bentre (?:as )?{HORA} e (?:as )?{HORA}", texto)
    if achado:
        inicio = _hora(achado[1], achado[2], achado[3])
        fim = _hora(achado[4], achado[5], achado[6] or achado[3])
        if inicio and fim and inicio < fim:
            return inicio, fim, None, f"entre {_relogio(inicio)} e {_relogio(fim)}"

    achado = re.search(rf"\b(?:depois d[aoe]s?|a partir d[aoe]s?|apos(?: as)?)\s+{HORA}", texto)
    if achado and (momento := _hora(achado[1], achado[2], achado[3])):
        return momento, None, None, f"a partir das {_relogio(momento)}"

    achado = re.search(rf"\b(?:antes d[aoe]s?|ate(?: as)?)\s+{HORA}", texto)
    if achado and (momento := _hora(achado[1], achado[2], achado[3])):
        return None, momento, None, f"antes das {_relogio(momento)}"

    achado = re.search(rf"(\bas )?\b{HORA}", texto)
    if achado and (
        achado[1] or achado[3] or achado[4] or re.search(r"\d\s*(horas?|hs|h)$", achado[0])
    ):
        momento = _hora(achado[2], achado[3], achado[4])
        if momento:
            return None, None, momento, f"perto das {_relogio(momento)}"

    for palavra, (depois, antes, rotulo) in PERIODOS.items():
        if re.search(rf"\b{palavra}\b", texto):
            return depois, antes, None, rotulo
    return None, None, None, None


def entender(texto: str, hoje: date, horizonte: int = 14) -> Desejo | None:
    simples = normalizar(texto)
    if not simples:
        return None
    dias, rotulo_dia = _dias(simples, hoje, horizonte)
    sem_datas = re.sub(r"\b\d{1,2}/\d{1,2}(/\d{2,4})?\b|\bdia \d{1,2}\b", " ", simples)
    depois, antes, perto, rotulo_horario = _horarios(sem_datas)
    if rotulo_dia is None and rotulo_horario is None:
        return None
    dias = [d for d in dias if d >= hoje]
    return Desejo(tuple(dias), depois, antes, perto, rotulo_dia, rotulo_horario)


def combina(inicio: time, desejo: Desejo) -> bool:
    if desejo.depois and inicio < desejo.depois:
        return False
    if desejo.antes and inicio >= desejo.antes:
        return False
    if desejo.perto:
        minutos = inicio.hour * 60 + inicio.minute
        alvo = desejo.perto.hour * 60 + desejo.perto.minute
        return abs(minutos - alvo) <= 60
    return True


def distancia(inicio: time, desejo: Desejo) -> int:
    if not desejo.perto:
        return 0
    return abs((inicio.hour - desejo.perto.hour) * 60 + inicio.minute - desejo.perto.minute)


PERIODOS_SUGERIDOS = ["de manhã", "à tarde", "à noite"]


def frases_candidatas(hoje: date, dias: int = 8) -> list[tuple[date, str]]:
    candidatas = []
    for adiante in range(dias):
        dia = hoje + timedelta(days=adiante)
        nome = NOMES_DIAS[dia.weekday()]
        rotulo = {0: "hoje", 1: "amanhã"}.get(adiante, nome if adiante < 7 else f"{nome} que vem")
        candidatas += [(dia, f"{rotulo} {periodo}") for periodo in PERIODOS_SUGERIDOS]
    return candidatas
