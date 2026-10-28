from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.configuracao import obter_configuracao
from app.modelos import Agendamento, HorarioFuncionamento, Negocio, StatusAgendamento

Expediente = list[tuple[time, time]]


@dataclass(frozen=True, slots=True)
class Intervalo:
    inicio: datetime
    fim: datetime

    def sobrepoe(self, outro: "Intervalo") -> bool:
        return self.inicio < outro.fim and outro.inicio < self.fim


def unir(intervalos: list[Intervalo]) -> list[Intervalo]:
    unidos: list[Intervalo] = []
    for atual in sorted(intervalos, key=lambda i: i.inicio):
        if unidos and atual.inicio <= unidos[-1].fim:
            ultimo = unidos[-1]
            unidos[-1] = Intervalo(ultimo.inicio, max(ultimo.fim, atual.fim))
        else:
            unidos.append(atual)
    return unidos


def horarios_livres(
    dia: date,
    fuso: ZoneInfo,
    expediente: Expediente,
    duracao: timedelta,
    ocupados: list[Intervalo],
    passo: timedelta,
    nao_antes_de: datetime,
) -> list[datetime]:
    bloqueados = unir(ocupados)
    horarios = []
    for abre, fecha in sorted(expediente):
        inicio = datetime.combine(dia, abre, fuso).astimezone(UTC)
        fim = datetime.combine(dia, fecha, fuso).astimezone(UTC)
        i = 0
        while inicio + duracao <= fim:
            termino = inicio + duracao
            while i < len(bloqueados) and bloqueados[i].fim <= inicio:
                i += 1
            livre = i == len(bloqueados) or bloqueados[i].inicio >= termino
            if inicio >= nao_antes_de and livre:
                horarios.append(inicio)
            inicio += passo
    return horarios


def horarios_reservaveis(
    dia: date,
    fuso: ZoneInfo,
    expediente: Expediente,
    duracao_minutos: int,
    ocupados: list[Intervalo],
    agora: datetime,
) -> list[datetime]:
    configuracao = obter_configuracao()
    return horarios_livres(
        dia,
        fuso,
        expediente,
        duracao=timedelta(minutes=duracao_minutos),
        ocupados=ocupados,
        passo=timedelta(minutes=configuracao.intervalo_horarios_minutos),
        nao_antes_de=agora + timedelta(minutes=configuracao.antecedencia_minima_minutos),
    )


def limites_do_dia(dia: date, fuso: ZoneInfo) -> Intervalo:
    inicio = datetime.combine(dia, time.min, fuso)
    return Intervalo(inicio.astimezone(UTC), (inicio + timedelta(days=1)).astimezone(UTC))


async def intervalos_ocupados(
    sessao: AsyncSession, negocio_id: int, janela: Intervalo, exceto_id: int | None = None
) -> list[Intervalo]:
    consulta = select(Agendamento.inicio, Agendamento.fim).where(
        Agendamento.negocio_id == negocio_id,
        Agendamento.status == StatusAgendamento.CONFIRMADO,
        Agendamento.inicio < janela.fim,
        Agendamento.fim > janela.inicio,
    )
    if exceto_id is not None:
        consulta = consulta.where(Agendamento.id != exceto_id)
    linhas = await sessao.execute(consulta)
    return [Intervalo(inicio, fim) for inicio, fim in linhas]


async def expedientes_da_semana(sessao: AsyncSession, negocio_id: int) -> dict[int, Expediente]:
    expedientes: dict[int, Expediente] = {}
    for dia_semana, abre, fecha in await sessao.execute(
        select(
            HorarioFuncionamento.dia_semana,
            HorarioFuncionamento.abre_as,
            HorarioFuncionamento.fecha_as,
        ).where(HorarioFuncionamento.negocio_id == negocio_id)
    ):
        expedientes.setdefault(dia_semana, []).append((abre, fecha))
    return expedientes


async def expediente_do_dia(sessao: AsyncSession, negocio_id: int, dia_semana: int) -> Expediente:
    linhas = await sessao.execute(
        select(HorarioFuncionamento.abre_as, HorarioFuncionamento.fecha_as).where(
            HorarioFuncionamento.negocio_id == negocio_id,
            HorarioFuncionamento.dia_semana == dia_semana,
        )
    )
    return [(abre, fecha) for abre, fecha in linhas]


async def horarios_do_dia(
    sessao: AsyncSession,
    negocio: Negocio,
    duracao_minutos: int,
    dia: date,
    expediente: Expediente | None = None,
    exceto_id: int | None = None,
) -> list[datetime]:
    configuracao = obter_configuracao()
    fuso = ZoneInfo(negocio.fuso_horario)
    agora = datetime.now(UTC)
    hoje = agora.astimezone(fuso).date()
    if not hoje <= dia <= hoje + timedelta(days=configuracao.janela_reserva_dias):
        return []

    if expediente is None:
        expediente = await expediente_do_dia(sessao, negocio.id, dia.weekday())
    if not expediente:
        return []

    ocupados = await intervalos_ocupados(sessao, negocio.id, limites_do_dia(dia, fuso), exceto_id)
    return horarios_reservaveis(dia, fuso, expediente, duracao_minutos, ocupados, agora)
