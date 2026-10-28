from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencias import IdNaRota, Sessao, UsuarioAtual
from app.esquemas import ServicoAtualizacao, ServicoEntrada, ServicoSaida
from app.modelos import Agendamento, Negocio, Servico

rotas = APIRouter(prefix="/servicos", tags=["serviços"])

EM_USO = HTTPException(
    status.HTTP_409_CONFLICT,
    "Esse serviço já tem agendamentos e não pode ser excluído. Arquive para tirá-lo da sua página.",
)


async def _servico_do_usuario(sessao: Sessao, usuario: UsuarioAtual, servico_id: int) -> Servico:
    servico = await sessao.get(Servico, servico_id)
    if servico is None or servico.negocio_id != usuario.negocio_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Serviço não encontrado.")
    return servico


@rotas.get("", response_model=list[ServicoSaida])
async def listar_servicos(usuario: UsuarioAtual, sessao: Sessao):
    resultado = await sessao.scalars(
        select(Servico).where(Servico.negocio_id == usuario.negocio_id).order_by(Servico.nome)
    )
    return resultado.all()


@rotas.post("", response_model=ServicoSaida, status_code=status.HTTP_201_CREATED)
async def criar_servico(dados: ServicoEntrada, usuario: UsuarioAtual, sessao: Sessao):
    servico = Servico(negocio_id=usuario.negocio_id, **dados.model_dump())
    sessao.add(servico)
    await sessao.commit()
    return servico


@rotas.patch("/{servico_id}", response_model=ServicoSaida)
async def atualizar_servico(
    servico_id: IdNaRota, dados: ServicoAtualizacao, usuario: UsuarioAtual, sessao: Sessao
):
    servico = await _servico_do_usuario(sessao, usuario, servico_id)
    for campo, valor in dados.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(servico, campo, valor)
    await sessao.commit()
    return servico


@rotas.delete("/{servico_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_servico(servico_id: IdNaRota, usuario: UsuarioAtual, sessao: Sessao):
    await sessao.execute(
        select(Negocio.id).where(Negocio.id == usuario.negocio_id).with_for_update()
    )
    servico = await _servico_do_usuario(sessao, usuario, servico_id)
    usado = await sessao.scalar(
        select(Agendamento.id).where(Agendamento.servico_id == servico.id).limit(1)
    )
    if usado is not None:
        raise EM_USO
    await sessao.delete(servico)
    try:
        await sessao.commit()
    except IntegrityError:
        raise EM_USO from None
