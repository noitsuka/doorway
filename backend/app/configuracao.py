from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_SO_LIBPQ = {"sslmode", "channel_binding", "options", "target_session_attrs"}


def para_url_asyncpg(url: str) -> str:
    partes = urlsplit(url)
    if partes.scheme not in {"postgres", "postgresql", "postgresql+asyncpg"}:
        return url
    consulta = dict(parse_qsl(partes.query))
    if consulta.get("sslmode") in {"require", "verify-ca", "verify-full"}:
        consulta.setdefault("ssl", "require")
    consulta = {k: v for k, v in consulta.items() if k not in _SO_LIBPQ}
    return urlunsplit(("postgresql+asyncpg", partes.netloc, partes.path, urlencode(consulta), ""))


def _env(nome: str, padrao=..., **regras):
    return Field(padrao, validation_alias=nome, **regras)


class Configuracao(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    url_banco: str = Field(
        default="postgresql+asyncpg://doorway:doorway@localhost:5432/doorway",
        validation_alias=AliasChoices("DATABASE_URL_UNPOOLED", "DATABASE_URL"),
    )
    tamanho_pool: int = _env("DB_POOL_SIZE", 15)
    excedente_pool: int = _env("DB_MAX_OVERFLOW", 0)
    espera_pool_segundos: float = _env("DB_POOL_TIMEOUT_SECONDS", 5)
    limite_consulta_ms: int = _env("DB_STATEMENT_TIMEOUT_MS", 5000)
    sem_pool: bool = _env("DB_NULL_POOL", False)

    segredo_jwt: str = _env("JWT_SECRET", min_length=32)
    algoritmo_jwt: str = _env("JWT_ALGORITHM", "HS256")
    minutos_token: int = _env("ACCESS_TOKEN_MINUTES", 60 * 24)

    intervalo_horarios_minutos: int = _env("SLOT_STEP_MINUTES", 15, ge=5, le=120)
    antecedencia_minima_minutos: int = _env("MIN_NOTICE_MINUTES", 60, ge=0)
    janela_reserva_dias: int = _env("BOOKING_WINDOW_DAYS", 60, ge=1, le=365)
    maximo_dias_listagem: int = _env("MAX_LISTING_DAYS", 62, ge=1)
    maximo_reservas_futuras_por_cliente: int = _env("MAX_UPCOMING_BOOKINGS_PER_CUSTOMER", 3, ge=1)
    maximo_reservas_futuras_por_ip: int = _env("MAX_UPCOMING_BOOKINGS_PER_IP", 6, ge=1)
    segundos_minimos_formulario: int = _env("MIN_FORM_SECONDS", 3, ge=0)
    maximo_bytes_corpo: int = _env("MAX_BODY_BYTES", 64 * 1024, ge=1024)

    limite_requisicoes_ativo: bool = _env("RATE_LIMIT_ENABLED", True)
    tentativas_login_por_minuto: int = _env("LOGIN_ATTEMPTS_PER_MINUTE", 10)
    cadastros_por_hora: int = _env("SIGNUPS_PER_HOUR", 10)
    reservas_por_minuto: int = _env("BOOKINGS_PER_MINUTE", 20)
    corridas_por_minuto: int = _env("RACE_TESTS_PER_MINUTE", 6)
    confiar_ip_real: bool = _env("TRUST_REAL_IP_HEADER", False)
    origens_cors: list[str] = _env("CORS_ORIGINS", ["http://localhost:3000"])

    email_demo: str = _env("DEMO_EMAIL", "demo@doorway.app")
    segredo_cron: str | None = _env("CRON_SECRET", None, min_length=16)

    @field_validator("url_banco")
    @classmethod
    def normalizar_url_banco(cls, valor: str) -> str:
        return para_url_asyncpg(valor)


@lru_cache
def obter_configuracao() -> Configuracao:
    return Configuracao()
