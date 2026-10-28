from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.configuracao import obter_configuracao
from app.dependencias import Sessao, UsuarioAtual
from app.esquemas import CadastroEntrada, LoginEntrada, TokenSaida, UsuarioSaida
from app.limite_requisicoes import limite_cadastro, limite_login
from app.modelos import Negocio, Usuario
from app.seguranca import criar_token_acesso, gerar_hash_senha, verificar_senha

rotas = APIRouter(prefix="/autenticacao", tags=["autenticação"])


@rotas.post(
    "/cadastro",
    response_model=TokenSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limite_cadastro)],
)
async def cadastrar(dados: CadastroEntrada, sessao: Sessao):
    negocio = Negocio(nome=dados.nome_negocio, slug=dados.slug, fuso_horario=dados.fuso_horario)
    usuario = Usuario(
        negocio=negocio,
        nome=dados.nome,
        email=dados.email.lower(),
        hash_senha=await gerar_hash_senha(dados.senha),
    )
    sessao.add(usuario)
    try:
        await sessao.commit()
    except IntegrityError:
        await sessao.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Esse e-mail ou link já está em uso."
        ) from None
    return TokenSaida(token_acesso=criar_token_acesso(usuario.id))


@rotas.post("/login", response_model=TokenSaida, dependencies=[Depends(limite_login)])
async def entrar(dados: LoginEntrada, sessao: Sessao):
    usuario = await sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not await verificar_senha(dados.senha, usuario.hash_senha if usuario else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-mail ou senha incorretos.")
    return TokenSaida(token_acesso=criar_token_acesso(usuario.id))


@rotas.get("/eu", response_model=UsuarioSaida)
async def usuario_atual(usuario: UsuarioAtual):
    return usuario


@rotas.post("/demo", response_model=TokenSaida, dependencies=[Depends(limite_login)])
async def entrar_na_demo(sessao: Sessao):
    usuario = await sessao.scalar(
        select(Usuario).where(Usuario.email == obter_configuracao().email_demo)
    )
    if usuario is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "A conta de demonstração está sendo recriada. Tente em instantes.",
        )
    return TokenSaida(token_acesso=criar_token_acesso(usuario.id))
