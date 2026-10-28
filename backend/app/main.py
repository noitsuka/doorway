import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import exc, text

from app.banco import engine
from app.configuracao import obter_configuracao
from app.dependencias import SessaoLeitura
from app.middleware import ContextoRequisicao, LimiteTamanhoCorpo
from app.rotas import (
    agendamentos,
    autenticacao,
    bloqueios,
    calendario,
    demanda,
    demo,
    gestao,
    horarios,
    negocio,
    publico,
    servicos,
)

log = logging.getLogger("doorway")

SQLSTATES_TRANSITORIOS = {
    "40001",
    "40P01",
    "53300",
    "57014",
    "57P03",
}
FORA_DO_PERMITIDO = {
    "greater_than",
    "greater_than_equal",
    "less_than",
    "less_than_equal",
    "int_parsing",
    "int_from_float",
    "too_long",
}


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(title="API do Doorway", version="0.1.0", lifespan=ciclo_de_vida)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=obter_configuracao().origens_cors,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["Retry-After", "X-Request-ID"],
    max_age=600,
)
app.add_middleware(LimiteTamanhoCorpo, maximo_bytes=obter_configuracao().maximo_bytes_corpo)
app.add_middleware(ContextoRequisicao)

for modulo in (
    autenticacao,
    negocio,
    servicos,
    horarios,
    agendamentos,
    bloqueios,
    gestao,
    publico,
    calendario,
    demanda,
    demo,
):
    app.include_router(modulo.rotas)


def _id_requisicao(requisicao: Request) -> str:
    return requisicao.scope.get("state", {}).get("id_requisicao", "-")


def mensagem_de_validacao(erro: dict) -> str:
    tipo = erro.get("type", "")
    campo = str((erro.get("loc") or ("",))[-1])
    if tipo == "missing":
        return "Campo obrigatório."
    if tipo == "string_too_short":
        minimo = (erro.get("ctx") or {}).get("min_length")
        return "Campo obrigatório." if minimo == 1 else "Muito curto."
    if tipo == "string_too_long":
        return "Muito longo."
    if tipo == "string_pattern_mismatch":
        if campo == "slug":
            return "Use letras minúsculas, números e hífens."
        return "Telefone inválido." if "telefone" in campo else "Formato inválido."
    if tipo in FORA_DO_PERMITIDO:
        return "Valor fora do permitido."
    if tipo.startswith(("datetime", "date", "time", "timezone")):
        return "Data ou hora inválida."
    if tipo == "email_temporario":
        return "E-mails temporários não são aceitos. Use um endereço que você acessa."
    if "email" in campo:
        return "E-mail inválido."
    if tipo == "value_error":
        texto = str(erro.get("msg", "")).removeprefix("Value error, ")
        return f"{texto[:1].upper()}{texto[1:]}." if texto else "Valor inválido."
    return "Valor inválido."


@app.exception_handler(RequestValidationError)
async def erro_de_validacao(requisicao: Request, erro: RequestValidationError):
    erros = [
        {"loc": list(e.get("loc", ())), "msg": mensagem_de_validacao(e), "type": e.get("type", "")}
        for e in erro.errors()
    ]
    return JSONResponse({"detail": erros}, status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)


@app.exception_handler(exc.OperationalError)
@app.exception_handler(exc.InterfaceError)
@app.exception_handler(exc.TimeoutError)
@app.exception_handler(TimeoutError)
async def banco_indisponivel(requisicao: Request, erro: Exception):
    log.warning(
        "[%s] banco indisponível em %s %s: %s",
        _id_requisicao(requisicao),
        requisicao.method,
        requisicao.url.path,
        erro,
    )
    return JSONResponse(
        {"detail": "Serviço instável agora. Tente em instantes."},
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        headers={"Retry-After": "5"},
    )


@app.exception_handler(exc.DBAPIError)
async def erro_de_banco(requisicao: Request, erro: exc.DBAPIError):
    if getattr(erro.orig, "sqlstate", None) in SQLSTATES_TRANSITORIOS:
        return await banco_indisponivel(requisicao, erro)
    raise erro


@app.exception_handler(Exception)
async def erro_inesperado(requisicao: Request, erro: Exception):
    id_requisicao = _id_requisicao(requisicao)
    log.exception(
        "[%s] erro não tratado em %s %s", id_requisicao, requisicao.method, requisicao.url.path
    )
    return JSONResponse(
        {"detail": "Algo deu errado do nosso lado. Tente de novo.", "id_requisicao": id_requisicao},
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


@app.get("/saude", tags=["saúde"])
async def saude():
    return {"status": "ok"}


@app.get("/saude/pronta", tags=["saúde"])
async def saude_pronta(sessao: SessaoLeitura):
    await sessao.execute(text("SELECT 1"))
    return {"status": "ok", "banco": "ok"}
