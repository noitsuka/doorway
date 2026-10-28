from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.banco import obter_sessao, obter_sessao_leitura
from app.esquemas import ID_MAXIMO, PADRAO_SLUG
from app.modelos import Usuario
from app.seguranca import decodificar_token_acesso

Sessao = Annotated[AsyncSession, Depends(obter_sessao)]
SessaoLeitura = Annotated[AsyncSession, Depends(obter_sessao_leitura)]
IdNaRota = Annotated[int, Path(gt=0, le=ID_MAXIMO)]
SlugNaRota = Annotated[str, Path(pattern=PADRAO_SLUG, max_length=60)]

portador = HTTPBearer(auto_error=False)


async def obter_usuario_atual(
    sessao: Sessao,
    credenciais: Annotated[HTTPAuthorizationCredentials | None, Depends(portador)],
) -> Usuario:
    nao_autorizado = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Sessão inválida ou ausente. Entre de novo.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credenciais is None:
        raise nao_autorizado
    usuario_id = decodificar_token_acesso(credenciais.credentials)
    if usuario_id is None or not 0 < usuario_id <= ID_MAXIMO:
        raise nao_autorizado
    usuario = await sessao.get(Usuario, usuario_id, options=[joinedload(Usuario.negocio)])
    if usuario is None:
        raise nao_autorizado
    return usuario


UsuarioAtual = Annotated[Usuario, Depends(obter_usuario_atual)]
