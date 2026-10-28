from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.dependencias import SessaoLeitura
from app.modelos import Agendamento, Negocio, StatusAgendamento
from app.painel_publico import contato_visivel

rotas = APIRouter(prefix="/agenda", tags=["agenda no celular"])

Token = Annotated[str, Path(pattern=r"^[A-Za-z0-9_-]{20,64}$")]
HISTORICO = timedelta(days=30)
MAXIMO_EVENTOS = 1000


def _escapar(texto: str) -> str:
    return (
        texto.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def _dobrar(linha: str) -> str:
    bruto = linha.encode()
    if len(bruto) <= 75:
        return linha
    partes, inicio = [], 0
    while inicio < len(bruto):
        fim = min(inicio + (75 if not partes else 74), len(bruto))
        while fim < len(bruto) and (bruto[fim] & 0xC0) == 0x80:
            fim -= 1
        partes.append(bruto[inicio:fim].decode())
        inicio = fim
    return "\r\n ".join(partes)


def _carimbo(momento: datetime) -> str:
    return momento.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")


def montar_agenda(negocio: Negocio, agendamentos: list[Agendamento]) -> str:
    agora = _carimbo(datetime.now(UTC))
    linhas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Doorway//Agenda//PT-BR",
        "CALSCALE:GREGORIAN",
        f"X-WR-CALNAME:{_escapar(negocio.nome)}",
        f"X-WR-TIMEZONE:{negocio.fuso_horario}",
        "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    ]
    for agendamento in agendamentos:
        nome, email, telefone = contato_visivel(
            negocio.slug,
            agendamento.nome_cliente,
            agendamento.email_cliente,
            agendamento.telefone_cliente,
        )
        descricao = "\n".join(filter(None, [telefone, email]))
        resumo = f"{agendamento.servico.nome} · {nome}"
        linhas += [
            "BEGIN:VEVENT",
            f"UID:agendamento-{agendamento.id}@doorway",
            f"DTSTAMP:{agora}",
            f"DTSTART:{_carimbo(agendamento.inicio)}",
            f"DTEND:{_carimbo(agendamento.fim)}",
            f"SUMMARY:{_escapar(resumo)}",
            f"DESCRIPTION:{_escapar(descricao)}",
            "END:VEVENT",
        ]
    linhas.append("END:VCALENDAR")
    return "\r\n".join(_dobrar(linha) for linha in linhas) + "\r\n"


@rotas.get(
    "/{token}.ics", response_class=Response, responses={200: {"content": {"text/calendar": {}}}}
)
async def obter_agenda(token: Token, sessao: SessaoLeitura):
    negocio = await sessao.scalar(select(Negocio).where(Negocio.token_agenda == token))
    if negocio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agenda não encontrada.")
    resultado = await sessao.scalars(
        select(Agendamento)
        .options(joinedload(Agendamento.servico))
        .where(
            Agendamento.negocio_id == negocio.id,
            Agendamento.status == StatusAgendamento.CONFIRMADO,
            Agendamento.inicio >= datetime.now(UTC) - HISTORICO,
        )
        .order_by(Agendamento.inicio)
        .limit(MAXIMO_EVENTOS)
    )
    return Response(
        montar_agenda(negocio, list(resultado)),
        media_type="text/calendar; charset=utf-8",
        headers={"Cache-Control": "private, max-age=300"},
    )
