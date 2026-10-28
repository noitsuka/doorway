import hashlib
import hmac
import time

from pydantic_core import PydanticCustomError
from sqlalchemy import String, cast, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.configuracao import obter_configuracao
from app.modelos import Agendamento, Bloqueio, StatusAgendamento

VALIDADE_FORMULARIO_SEGUNDOS = 6 * 3600
FORMULARIO_INVALIDO = (
    "Não foi possível confirmar o agendamento. Recarregue a página e tente de novo."
)
CLIENTE_BLOQUEADO = (
    "Não foi possível concluir o agendamento. Entre em contato com o estabelecimento."
)
LIMITE_DA_CONEXAO = "Muitos agendamentos futuros feitos desta conexão neste local."

DOMINIOS_TEMPORARIOS = frozenset(
    {
        "10minutemail.com",
        "20minutemail.com",
        "33mail.com",
        "byom.de",
        "discard.email",
        "dispostable.com",
        "emailondeck.com",
        "fakeinbox.com",
        "fakemail.net",
        "getairmail.com",
        "getnada.com",
        "guerrillamail.com",
        "guerrillamail.net",
        "guerrillamailblock.com",
        "inboxkitten.com",
        "maildrop.cc",
        "mailinator.com",
        "mailnesia.com",
        "mailpoof.com",
        "mintemail.com",
        "moakt.com",
        "mohmal.com",
        "mytemp.email",
        "nada.email",
        "sharklasers.com",
        "spam4.me",
        "spamgourmet.com",
        "temp-mail.org",
        "tempail.com",
        "tempmail.com",
        "tempmail.dev",
        "tempmailo.com",
        "tempr.email",
        "throwawaymail.com",
        "trashmail.com",
        "trashmail.de",
        "yopmail.com",
        "yopmail.fr",
    }
)


class ErroAntifraude(Exception):
    def __init__(self, detalhe: str, situacao: int) -> None:
        super().__init__(detalhe)
        self.detalhe = detalhe
        self.situacao = situacao


def _assinar(mensagem: str) -> str:
    segredo = obter_configuracao().segredo_jwt.encode()
    return hmac.new(segredo, mensagem.encode(), hashlib.sha256).hexdigest()


def gerar_token_formulario(slug: str, agora: float | None = None) -> str:
    momento = int(time.time() if agora is None else agora)
    return f"{momento}.{_assinar(f'formulario|{slug}|{momento}')[:24]}"


def conferir_formulario(
    slug: str, token: str | None, armadilha: str | None, agora: float | None = None
) -> None:
    if armadilha or not token:
        raise ErroAntifraude(FORMULARIO_INVALIDO, 400)
    momento, _, assinatura = token.partition(".")
    if not momento.isdigit():
        raise ErroAntifraude(FORMULARIO_INVALIDO, 400)
    esperada = _assinar(f"formulario|{slug}|{momento}")[:24]
    idade = (time.time() if agora is None else agora) - int(momento)
    if (
        not hmac.compare_digest(assinatura, esperada)
        or idade < obter_configuracao().segundos_minimos_formulario
        or idade > VALIDADE_FORMULARIO_SEGUNDOS
    ):
        raise ErroAntifraude(FORMULARIO_INVALIDO, 400)


def email_aceito(email: str) -> str:
    dominio = email.rpartition("@")[2].lower()
    if dominio in DOMINIOS_TEMPORARIOS:
        raise PydanticCustomError("email_temporario", "e-mail temporário")
    return email


def digitos(telefone: str | None) -> str | None:
    return "".join(c for c in telefone if c.isdigit()) if telefone else None


def hash_da_conexao(ip: str) -> str:
    return _assinar(f"conexao|{ip}")[:16]


async def conferir_bloqueio(
    sessao: AsyncSession, negocio_id: int, email: str | None, telefone: str | None
) -> None:
    condicoes = [Bloqueio.email == email] if email else []
    if numero := digitos(telefone):
        condicoes.append(Bloqueio.telefone == numero)
    if not condicoes:
        return
    bloqueado = await sessao.scalar(
        select(Bloqueio.id).where(Bloqueio.negocio_id == negocio_id, or_(*condicoes)).limit(1)
    )
    if bloqueado is not None:
        raise ErroAntifraude(CLIENTE_BLOQUEADO, 403)


async def conferir_limite_da_conexao(
    sessao: AsyncSession, negocio_id: int, conexao: str, agora
) -> None:
    reserva = func.coalesce(Agendamento.grupo, cast(Agendamento.id, String))
    futuras = await sessao.scalar(
        select(func.count(distinct(reserva))).where(
            Agendamento.negocio_id == negocio_id,
            Agendamento.conexao == conexao,
            Agendamento.status == StatusAgendamento.CONFIRMADO,
            Agendamento.fim > agora,
        )
    )
    if futuras >= obter_configuracao().maximo_reservas_futuras_por_ip:
        raise ErroAntifraude(LIMITE_DA_CONEXAO, 409)
