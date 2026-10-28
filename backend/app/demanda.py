import hashlib
import hmac
import logging
import random
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, exc, func, select
from sqlalchemy.dialects.postgresql import insert as insert_postgres
from sqlalchemy.dialects.sqlite import insert as insert_sqlite
from sqlalchemy.ext.asyncio import AsyncSession

from app.configuracao import obter_configuracao
from app.disponibilidade import Expediente, horarios_reservaveis
from app.frases import Desejo, combina
from app.modelos import DemandaPerdida, MotivoDemanda, OrigemDemanda

log = logging.getLogger("doorway")

INICIO_DOS_TEMPOS = datetime(2000, 1, 1, tzinfo=UTC)
RETENCAO_DIAS = 120
MAXIMO_HORAS_SUGERIDAS = 3
MINIMO_PEDIDOS_PARA_SUGERIR = 2


@dataclass(frozen=True, slots=True)
class Perda:
    dia: date
    hora: int | None
    motivo: MotivoDemanda


def chave_visitante(ip: str, hoje: date) -> str:
    segredo = obter_configuracao().segredo_jwt.encode()
    mensagem = f"{ip}|{hoje.isoformat()}".encode()
    return hmac.new(segredo, mensagem, hashlib.sha256).hexdigest()[:16]


def hora_do_desejo(desejo: Desejo) -> int | None:
    if desejo.perto:
        return desejo.perto.hour
    if desejo.depois:
        return desejo.depois.hour
    if desejo.antes:
        return max(desejo.antes.hour - (1 if desejo.antes.minute == 0 else 0), 0)
    return None


def classificar(
    dia: date,
    fuso: ZoneInfo,
    expediente: Expediente,
    duracao_minutos: int,
    agora: datetime,
    filtro=lambda inicio: True,
) -> MotivoDemanda | None:
    def possiveis(referencia: datetime) -> bool:
        inicios = horarios_reservaveis(dia, fuso, expediente, duracao_minutos, [], referencia)
        return any(filtro(i.astimezone(fuso).time()) for i in inicios)

    if possiveis(agora):
        return MotivoDemanda.LOTADO
    if possiveis(INICIO_DOS_TEMPOS):
        return None
    return MotivoDemanda.FECHADO


def perda_do_dia(
    dia: date, fuso: ZoneInfo, expediente: Expediente, duracao_minutos: int, agora: datetime
) -> list[Perda]:
    motivo = classificar(dia, fuso, expediente, duracao_minutos, agora)
    return [Perda(dia, None, motivo)] if motivo else []


def perdas_da_busca(
    desejo: Desejo,
    dias: list[date],
    fuso: ZoneInfo,
    expedientes: dict[int, Expediente],
    duracao_minutos: int,
    agora: datetime,
) -> list[Perda]:
    hora = hora_do_desejo(desejo)
    perdas, vistos = [], set()
    for dia in dias:
        if dia.weekday() in vistos:
            continue
        vistos.add(dia.weekday())
        motivo = classificar(
            dia,
            fuso,
            expedientes.get(dia.weekday(), []),
            duracao_minutos,
            agora,
            filtro=lambda inicio: combina(inicio, desejo),
        )
        if motivo:
            perdas.append(Perda(dia, hora, motivo))
    return perdas


async def registrar(
    sessao: AsyncSession,
    negocio_id: int,
    visitante: str,
    origem: OrigemDemanda,
    perdas: list[Perda],
) -> None:
    if not perdas:
        return
    linhas = [
        {
            "negocio_id": negocio_id,
            "dia": p.dia,
            "hora": p.hora,
            "origem": origem,
            "motivo": p.motivo,
            "visitante": visitante,
        }
        for p in perdas
    ]
    inserir = insert_postgres if sessao.get_bind().dialect.name == "postgresql" else insert_sqlite
    try:
        await sessao.execute(inserir(DemandaPerdida).values(linhas).on_conflict_do_nothing())
        if random.random() < 0.01:
            limite = datetime.now(UTC) - timedelta(days=RETENCAO_DIAS)
            await sessao.execute(delete(DemandaPerdida).where(DemandaPerdida.criado_em < limite))
    except exc.SQLAlchemyError as erro:
        log.warning(
            "não foi possível registrar a demanda perdida do negócio %s: %r", negocio_id, erro
        )


@dataclass(frozen=True, slots=True)
class Sugestao:
    dia_semana: int
    de: int | None
    ate: int | None
    pedidos: int


def sugerir_abertura(contagem: Counter) -> Sugestao | None:
    melhor: Sugestao | None = None
    for dia_semana in range(7):
        dia_inteiro = contagem[(dia_semana, None, MotivoDemanda.FECHADO)]
        if dia_inteiro and (melhor is None or dia_inteiro > melhor.pedidos):
            melhor = Sugestao(dia_semana, None, None, dia_inteiro)
        por_hora = [contagem[(dia_semana, h, MotivoDemanda.FECHADO)] for h in range(24)]
        for tamanho in range(1, MAXIMO_HORAS_SUGERIDAS + 1):
            for de in range(24 - tamanho + 1):
                janela = por_hora[de : de + tamanho]
                if not janela[0] or not janela[-1]:
                    continue
                if melhor is None or sum(janela) > melhor.pedidos:
                    melhor = Sugestao(dia_semana, de, de + tamanho, sum(janela))
    if melhor is None or melhor.pedidos < MINIMO_PEDIDOS_PARA_SUGERIR:
        return None
    return melhor


async def relatorio(sessao: AsyncSession, negocio_id: int, dias: int) -> dict:
    desde = datetime.now(UTC) - timedelta(days=dias)
    linhas = await sessao.execute(
        select(DemandaPerdida.dia, DemandaPerdida.hora, DemandaPerdida.motivo, func.count())
        .where(DemandaPerdida.negocio_id == negocio_id, DemandaPerdida.criado_em >= desde)
        .group_by(DemandaPerdida.dia, DemandaPerdida.hora, DemandaPerdida.motivo)
    )
    contagem: Counter = Counter()
    for dia, hora, motivo, quantidade in linhas:
        contagem[(dia.weekday(), hora, MotivoDemanda(motivo))] += quantidade

    celulas: dict[tuple[int, int | None], dict] = {}
    for (dia_semana, hora, motivo), quantidade in contagem.items():
        celula = celulas.setdefault(
            (dia_semana, hora),
            {"dia_semana": dia_semana, "hora": hora, "fechado": 0, "lotado": 0},
        )
        celula[motivo.value] += quantidade

    fechado = sum(c["fechado"] for c in celulas.values())
    lotado = sum(c["lotado"] for c in celulas.values())
    return {
        "periodo_dias": dias,
        "total": fechado + lotado,
        "fechado": fechado,
        "lotado": lotado,
        "celulas": sorted(
            celulas.values(),
            key=lambda c: (c["dia_semana"], -1 if c["hora"] is None else c["hora"]),
        ),
        "sugestao": sugerir_abertura(contagem),
    }
