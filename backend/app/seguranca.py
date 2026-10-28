from datetime import UTC, datetime, timedelta

import jwt
from anyio import to_thread
from pwdlib import PasswordHash

from app.configuracao import obter_configuracao

hasher = PasswordHash.recommended()

_HASH_FICTICIO = hasher.hash("equalizador-de-tempo")


async def gerar_hash_senha(senha: str) -> str:
    return await to_thread.run_sync(hasher.hash, senha)


async def verificar_senha(senha: str, hash_salvo: str | None) -> bool:
    valida = await to_thread.run_sync(hasher.verify, senha, hash_salvo or _HASH_FICTICIO)
    return valida and hash_salvo is not None


def criar_token_acesso(usuario_id: int) -> str:
    configuracao = obter_configuracao()
    agora = datetime.now(UTC)
    conteudo = {
        "sub": str(usuario_id),
        "iat": agora,
        "exp": agora + timedelta(minutes=configuracao.minutos_token),
    }
    return jwt.encode(conteudo, configuracao.segredo_jwt, algorithm=configuracao.algoritmo_jwt)


def decodificar_token_acesso(token: str) -> int | None:
    configuracao = obter_configuracao()
    try:
        conteudo = jwt.decode(
            token,
            configuracao.segredo_jwt,
            algorithms=[configuracao.algoritmo_jwt],
            options={"require": ["exp", "sub"]},
        )
        return int(conteudo["sub"])
    except (jwt.PyJWTError, ValueError):
        return None
