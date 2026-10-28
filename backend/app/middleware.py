import re
import uuid

from fastapi import HTTPException, status
from starlette.types import ASGIApp, Message, Receive, Scope, Send

ID_REQUISICAO = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
CORPO_GRANDE_DEMAIS = "Os dados enviados são grandes demais."

CABECALHOS_SEGURANCA = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cache-control", b"no-store"),
]


class ContextoRequisicao:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        recebido = dict(scope["headers"]).get(b"x-request-id", b"").decode("latin-1")
        id_requisicao = recebido if ID_REQUISICAO.match(recebido) else uuid.uuid4().hex
        scope.setdefault("state", {})["id_requisicao"] = id_requisicao

        async def enviar_com_cabecalhos(mensagem: Message) -> None:
            if mensagem["type"] == "http.response.start":
                presentes = {nome for nome, _ in mensagem["headers"]}
                mensagem["headers"] = [
                    *mensagem["headers"],
                    (b"x-request-id", id_requisicao.encode()),
                    *(c for c in CABECALHOS_SEGURANCA if c[0] not in presentes),
                ]
            await send(mensagem)

        await self.app(scope, receive, enviar_com_cabecalhos)


class LimiteTamanhoCorpo:
    def __init__(self, app: ASGIApp, maximo_bytes: int) -> None:
        self.app = app
        self.maximo_bytes = maximo_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declarado = dict(scope["headers"]).get(b"content-length")
        if declarado is not None and (
            not declarado.isdigit() or int(declarado) > self.maximo_bytes
        ):
            await self._recusar(send)
            return

        recebidos = 0

        async def receber_limitado() -> Message:
            nonlocal recebidos
            mensagem = await receive()
            if mensagem["type"] == "http.request":
                recebidos += len(mensagem.get("body", b""))
                if recebidos > self.maximo_bytes:
                    raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, CORPO_GRANDE_DEMAIS)
            return mensagem

        await self.app(scope, receber_limitado, send)

    @staticmethod
    async def _recusar(send: Send) -> None:
        corpo = f'{{"detail":"{CORPO_GRANDE_DEMAIS}"}}'.encode()
        await send(
            {
                "type": "http.response.start",
                "status": status.HTTP_413_CONTENT_TOO_LARGE,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(corpo)).encode()),
                    (b"connection", b"close"),
                ],
            }
        )
        await send({"type": "http.response.body", "body": corpo})
