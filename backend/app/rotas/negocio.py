from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import delete

from app.configuracao import obter_configuracao
from app.dependencias import Sessao, UsuarioAtual
from app.esquemas import NegocioAtualizacao, NegocioSaida
from app.modelos import LogoNegocio, novo_token

rotas = APIRouter(prefix="/negocio", tags=["negócio"])

OBRIGATORIOS = {"nome", "cor_marca"}
MAXIMO_BYTES_LOGO = 60 * 1024
LOGO_INVALIDA = "A foto precisa ser PNG, JPEG ou WebP com até 60 KB."
LOGO_FIXA_NA_DEMO = "Na conta de demonstração a foto não pode ser trocada."


def identificar_imagem(dados: bytes) -> str | None:
    if dados.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if dados.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if dados[:4] == b"RIFF" and dados[8:12] == b"WEBP":
        return "image/webp"
    return None


def _garantir_logo_editavel(usuario: UsuarioAtual) -> None:
    if usuario.email == obter_configuracao().email_demo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, LOGO_FIXA_NA_DEMO)


@rotas.get("", response_model=NegocioSaida)
async def obter_negocio(usuario: UsuarioAtual):
    return usuario.negocio


@rotas.patch("", response_model=NegocioSaida)
async def atualizar_negocio(dados: NegocioAtualizacao, usuario: UsuarioAtual, sessao: Sessao):
    negocio = usuario.negocio
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if valor is None and campo in OBRIGATORIOS:
            continue
        setattr(negocio, campo, valor)
    await sessao.commit()
    return negocio


@rotas.put("/logo", response_model=NegocioSaida)
async def enviar_logo(requisicao: Request, usuario: UsuarioAtual, sessao: Sessao):
    _garantir_logo_editavel(usuario)
    dados = await requisicao.body()
    tipo = identificar_imagem(dados) if len(dados) <= MAXIMO_BYTES_LOGO else None
    if tipo is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, LOGO_INVALIDA)
    negocio = usuario.negocio
    await sessao.merge(LogoNegocio(negocio_id=negocio.id, tipo_conteudo=tipo, dados=dados))
    negocio.versao_logo = (negocio.versao_logo or 0) + 1
    await sessao.commit()
    return negocio


@rotas.delete("/logo", response_model=NegocioSaida)
async def remover_logo(usuario: UsuarioAtual, sessao: Sessao):
    _garantir_logo_editavel(usuario)
    negocio = usuario.negocio
    await sessao.execute(delete(LogoNegocio).where(LogoNegocio.negocio_id == negocio.id))
    negocio.versao_logo = None
    await sessao.commit()
    return negocio


@rotas.post("/token-agenda", response_model=NegocioSaida)
async def trocar_token_agenda(usuario: UsuarioAtual, sessao: Sessao):
    usuario.negocio.token_agenda = novo_token()
    await sessao.commit()
    return usuario.negocio
