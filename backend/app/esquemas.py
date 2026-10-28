import re
from datetime import date, datetime, time
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    AfterValidator,
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)

from app.antifraude import email_aceito
from app.modelos import StatusAgendamento

ID_MAXIMO = 2**31 - 1
PRECO_MAXIMO_CENTAVOS = 10_000_000
PRIMEIRO_ANO, ULTIMO_ANO = 2000, 2099
MAXIMO_PESSOAS_GRUPO = 4


def _fuso_valido(valor: str) -> str:
    try:
        ZoneInfo(valor)
    except (ZoneInfoNotFoundError, ValueError, OSError):
        raise ValueError("fuso horário desconhecido") from None
    return valor


def _hora_local(valor: time) -> time:
    if valor.tzinfo is not None:
        raise ValueError("envie a hora local, sem fuso")
    return valor.replace(second=0, microsecond=0)


def _data_hora_plausivel(valor: datetime) -> datetime:
    if not PRIMEIRO_ANO <= valor.year <= ULTIMO_ANO:
        raise ValueError("data fora do intervalo permitido")
    return valor


_TEXTO_INSEGURO = re.compile(r"[\x00-\x1f\x7f​-‏‪-‮⁦-⁩\ud800-\udfff]")
_NAO_CODIFICAVEL = re.compile(r"[\x00\ud800-\udfff]")

SLUGS_RESERVADOS = frozenset(
    {"admin", "api", "app", "dashboard", "docs", "health", "help", "login", "logout", "public"}
    | {"settings", "signup", "static", "support", "www", "manage", "demo", "internal"}
    | {"como-foi-feito", "privacidade", "termos", "status", "painel", "entrar", "cadastro"}
    | {"agendamento", "publico", "gestao", "autenticacao", "saude", "interno", "agenda"}
)


def _texto_seguro(valor: str) -> str:
    if _TEXTO_INSEGURO.search(valor):
        raise ValueError("contém caracteres que não são permitidos")
    return valor


def _codificavel(valor: str) -> str:
    if _NAO_CODIFICAVEL.search(valor):
        raise ValueError("contém caracteres que não são permitidos")
    return valor


def _nao_reservado(valor: str) -> str:
    if valor in SLUGS_RESERVADOS:
        raise ValueError("esse link é reservado")
    return valor


def _nome_real(valor: str) -> str:
    if sum(c.isalpha() for c in valor) < 2:
        raise ValueError("escreva o nome")
    return valor


def _telefone_real(valor: str) -> str:
    numero = "".join(c for c in valor if c.isdigit())
    if not 10 <= len(numero) <= 15:
        raise ValueError("informe o telefone com DDD")
    return numero


PADRAO_SLUG = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"

Id = Annotated[int, Field(gt=0, le=ID_MAXIMO)]
Nome = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=120),
    AfterValidator(_texto_seguro),
]
Slug = Annotated[
    str,
    StringConstraints(pattern=PADRAO_SLUG, min_length=3, max_length=60),
    AfterValidator(_nao_reservado),
]
FusoHorario = Annotated[str, StringConstraints(max_length=64), AfterValidator(_fuso_valido)]
Telefone = Annotated[
    str,
    StringConstraints(strip_whitespace=True, pattern=r"^\+?[0-9 ()-]{8,20}$"),
    AfterValidator(_telefone_real),
]
NomeCliente = Annotated[Nome, AfterValidator(_nome_real)]
EmailCliente = Annotated[EmailStr, AfterValidator(email_aceito)]
TokenFormulario = Annotated[str, StringConstraints(max_length=64)]
Armadilha = Annotated[str, StringConstraints(max_length=200)]
Senha = Annotated[
    str, StringConstraints(min_length=8, max_length=128), AfterValidator(_codificavel)
]
DataHoraPlausivel = Annotated[AwareDatetime, AfterValidator(_data_hora_plausivel)]
CorMarca = Annotated[str, StringConstraints(pattern=r"^#[0-9a-fA-F]{6}$")]
Categoria = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=40),
    AfterValidator(_texto_seguro),
]
Chamada = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=160),
    AfterValidator(_texto_seguro),
]
HoraLocal = Annotated[time, AfterValidator(_hora_local)]
Duracao = Annotated[int, Field(ge=5, le=480)]
Preco = Annotated[int, Field(ge=0, le=PRECO_MAXIMO_CENTAVOS)]


class ModeloORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CadastroEntrada(BaseModel):
    nome_negocio: Nome
    slug: Slug
    fuso_horario: FusoHorario = "America/Sao_Paulo"
    nome: Nome
    email: EmailStr
    senha: Senha


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: Annotated[str, StringConstraints(max_length=128), AfterValidator(_codificavel)]


class TokenSaida(BaseModel):
    token_acesso: str
    tipo_token: str = "bearer"


class NegocioSaida(ModeloORM):
    id: int
    nome: str
    slug: str
    fuso_horario: str
    categoria: str | None
    chamada: str | None
    cor_marca: str
    versao_logo: int | None
    token_agenda: str


class NegocioAtualizacao(BaseModel):
    nome: Nome | None = None
    categoria: Categoria | None = None
    chamada: Chamada | None = None
    cor_marca: CorMarca | None = None


class UsuarioSaida(ModeloORM):
    id: int
    nome: str
    email: str
    negocio: NegocioSaida


class ServicoEntrada(BaseModel):
    nome: Nome
    duracao_minutos: Duracao
    preco_centavos: Preco


class ServicoAtualizacao(BaseModel):
    nome: Nome | None = None
    duracao_minutos: Duracao | None = None
    preco_centavos: Preco | None = None
    ativo: bool | None = None


class ServicoSaida(ModeloORM):
    id: int
    nome: str
    duracao_minutos: int
    preco_centavos: int
    ativo: bool


class HorarioEntrada(BaseModel):
    dia_semana: int = Field(ge=0, le=6, description="0 = segunda-feira")
    abre_as: HoraLocal
    fecha_as: HoraLocal

    @model_validator(mode="after")
    def conferir_intervalo(self):
        if self.abre_as >= self.fecha_as:
            raise ValueError("o horário de abertura precisa ser antes do fechamento")
        return self


class HorarioSaida(ModeloORM):
    dia_semana: int
    abre_as: time
    fecha_as: time


class NegocioPublicoSaida(ModeloORM):
    nome: str
    slug: str
    fuso_horario: str
    categoria: str | None
    chamada: str | None
    cor_marca: str
    versao_logo: int | None
    servicos: list[ServicoSaida]
    token_formulario: str = ""


class NegocioResumo(ModeloORM):
    nome: str
    slug: str
    fuso_horario: str
    categoria: str | None
    cor_marca: str
    versao_logo: int | None


class HorariosLivresSaida(BaseModel):
    data: date
    servicos: list[int]
    duracao_minutos: int
    horarios: list[datetime]


class BuscaSaida(BaseModel):
    entendido: bool
    rotulo_dia: str | None = None
    rotulo_horario: str | None = None
    horarios: list[datetime] = []


class ReservaEntrada(BaseModel):
    servico_id: Id
    inicio: DataHoraPlausivel
    nome_cliente: NomeCliente
    email_cliente: EmailCliente | None = None
    telefone_cliente: Telefone
    token_formulario: TokenFormulario | None = None
    site: Armadilha | None = None


class AgendamentoSaida(ModeloORM):
    id: int
    servico: ServicoSaida
    nome_cliente: str
    email_cliente: str | None
    telefone_cliente: str | None
    inicio: datetime
    fim: datetime
    status: StatusAgendamento
    grupo: str | None = None


class ReservaSaida(AgendamentoSaida):
    token_gestao: str


class PessoaGrupo(BaseModel):
    nome_cliente: NomeCliente
    servico_id: Id


class GrupoEntrada(BaseModel):
    inicio: DataHoraPlausivel
    email_cliente: EmailCliente | None = None
    telefone_cliente: Telefone
    pessoas: Annotated[list[PessoaGrupo], Field(min_length=2, max_length=MAXIMO_PESSOAS_GRUPO)]
    token_formulario: TokenFormulario | None = None
    site: Armadilha | None = None


class GrupoSaida(BaseModel):
    grupo: str
    agendamentos: list[ReservaSaida]


class AgendamentoGerenciadoSaida(AgendamentoSaida):
    negocio: NegocioResumo


class RemarcacaoEntrada(BaseModel):
    inicio: DataHoraPlausivel


class SugestoesSaida(BaseModel):
    sugestoes: list[str]


class DiaLivre(BaseModel):
    data: date
    livres: int


class DiasLivresSaida(BaseModel):
    dias: list[DiaLivre]


class AgendaDoDia(BaseModel):
    data: date
    quantidade: int


class BloqueioEntrada(BaseModel):
    agendamento_id: Id
    cancelar_futuros: bool = True


class BloqueioSaida(ModeloORM):
    id: int
    email: str | None
    telefone: str | None
    criado_em: datetime


class BloqueioCriado(BaseModel):
    bloqueio: BloqueioSaida
    cancelados: int


class CelulaDemanda(BaseModel):
    dia_semana: int
    hora: int | None
    fechado: int
    lotado: int


class SugestaoAbertura(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dia_semana: int
    de: int | None
    ate: int | None
    pedidos: int


class DemandaSaida(BaseModel):
    periodo_dias: int
    total: int
    fechado: int
    lotado: int
    celulas: list[CelulaDemanda]
    sugestao: SugestaoAbertura | None


class CorridaEntrada(BaseModel):
    pedidos: int = Field(default=20, ge=2, le=30)


class TentativaCorrida(BaseModel):
    pedido: int
    aceito: bool
    duracao_ms: float


class CorridaSaida(BaseModel):
    horario: datetime
    pedidos: int
    aceitos: int
    recusados: int
    duracao_ms: float
    tentativas: list[TentativaCorrida]
