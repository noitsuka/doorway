from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, or_, select, update

from app.antifraude import digitos
from app.dependencias import IdNaRota, Sessao, UsuarioAtual
from app.esquemas import BloqueioCriado, BloqueioEntrada, BloqueioSaida
from app.modelos import Agendamento, Bloqueio, StatusAgendamento
from app.painel_publico import contato_visivel

rotas = APIRouter(prefix="/bloqueios", tags=["clientes bloqueados"])


def _para_saida(bloqueio: Bloqueio, slug: str) -> BloqueioSaida:
    _, email, telefone = contato_visivel(slug, "", bloqueio.email, bloqueio.telefone)
    return BloqueioSaida(
        id=bloqueio.id,
        email=email,
        telefone=telefone,
        criado_em=bloqueio.criado_em,
    )


@rotas.get("", response_model=list[BloqueioSaida])
async def listar_bloqueios(usuario: UsuarioAtual, sessao: Sessao):
    resultado = await sessao.scalars(
        select(Bloqueio)
        .where(Bloqueio.negocio_id == usuario.negocio_id)
        .order_by(Bloqueio.criado_em.desc())
    )
    return [_para_saida(b, usuario.negocio.slug) for b in resultado]


@rotas.post("", response_model=BloqueioCriado, status_code=status.HTTP_201_CREATED)
async def bloquear_cliente(dados: BloqueioEntrada, usuario: UsuarioAtual, sessao: Sessao):
    agendamento = await sessao.scalar(
        select(Agendamento).where(
            Agendamento.id == dados.agendamento_id,
            Agendamento.negocio_id == usuario.negocio_id,
        )
    )
    if agendamento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agendamento não encontrado.")

    email, telefone = agendamento.email_cliente, digitos(agendamento.telefone_cliente)
    condicoes = ([Bloqueio.email == email] if email else []) + (
        [Bloqueio.telefone == telefone] if telefone else []
    )
    bloqueio = await sessao.scalar(
        select(Bloqueio).where(Bloqueio.negocio_id == usuario.negocio_id, or_(*condicoes)).limit(1)
    )
    if bloqueio is None:
        bloqueio = Bloqueio(negocio_id=usuario.negocio_id, email=email, telefone=telefone)
        sessao.add(bloqueio)

    cancelados = 0
    if dados.cancelar_futuros:
        resultado = await sessao.execute(
            update(Agendamento)
            .where(
                Agendamento.negocio_id == usuario.negocio_id,
                or_(
                    *([Agendamento.email_cliente == email] if email else []),
                    *([Agendamento.telefone_cliente == telefone] if telefone else []),
                ),
                Agendamento.status == StatusAgendamento.CONFIRMADO,
                Agendamento.inicio > datetime.now(UTC),
            )
            .values(status=StatusAgendamento.CANCELADO)
        )
        cancelados = resultado.rowcount
    await sessao.commit()
    await sessao.refresh(bloqueio)
    return BloqueioCriado(
        bloqueio=_para_saida(bloqueio, usuario.negocio.slug), cancelados=cancelados
    )


@rotas.delete("/{bloqueio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def desbloquear_cliente(bloqueio_id: IdNaRota, usuario: UsuarioAtual, sessao: Sessao):
    resultado = await sessao.execute(
        delete(Bloqueio).where(
            Bloqueio.id == bloqueio_id, Bloqueio.negocio_id == usuario.negocio_id
        )
    )
    if resultado.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Bloqueio não encontrado.")
    await sessao.commit()
