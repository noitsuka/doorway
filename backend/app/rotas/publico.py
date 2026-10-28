from datetime import UTC, date, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, with_loader_criteria

from app.antifraude import (
    ErroAntifraude,
    conferir_formulario,
    gerar_token_formulario,
    hash_da_conexao,
)
from app.configuracao import obter_configuracao
from app.demanda import chave_visitante, perda_do_dia, perdas_da_busca, registrar
from app.dependencias import Sessao, SessaoLeitura, SlugNaRota
from app.disponibilidade import (
    Intervalo,
    expedientes_da_semana,
    horarios_do_dia,
    horarios_reservaveis,
    intervalos_ocupados,
    limites_do_dia,
)
from app.esquemas import (
    ID_MAXIMO,
    MAXIMO_PESSOAS_GRUPO,
    BuscaSaida,
    DiaLivre,
    DiasLivresSaida,
    GrupoEntrada,
    GrupoSaida,
    HorariosLivresSaida,
    NegocioPublicoSaida,
    ReservaEntrada,
    ReservaSaida,
    SugestoesSaida,
)
from app.frases import combina, distancia, entender, frases_candidatas
from app.limite_requisicoes import ip_do_cliente, limite_reserva
from app.modelos import HorarioFuncionamento, LogoNegocio, Negocio, OrigemDemanda, Servico
from app.reservas import (
    ErroReserva,
    consulta_servicos_ativos,
    na_ordem_pedida,
    reservar_em_sequencia,
    travar_servico,
    travar_servicos,
)

rotas = APIRouter(prefix="/publico/{slug}", tags=["página pública"])

SERVICO_NAO_ENCONTRADO = HTTPException(status.HTTP_404_NOT_FOUND, "Serviço não encontrado.")
MAXIMO_SUGESTOES = 6

ServicosNaConsulta = Annotated[
    list[Annotated[int, Field(gt=0, le=ID_MAXIMO)]],
    Query(min_length=1, max_length=MAXIMO_PESSOAS_GRUPO),
]


async def _servicos_ativos(sessao: AsyncSession, slug: str, servico_ids: list[int]):
    resultado = await sessao.scalars(consulta_servicos_ativos(slug, servico_ids))
    servicos = na_ordem_pedida(resultado.unique().all(), servico_ids)
    if servicos is None:
        raise SERVICO_NAO_ENCONTRADO
    return servicos


@rotas.get("", response_model=NegocioPublicoSaida)
async def obter_negocio(slug: SlugNaRota, sessao: SessaoLeitura):
    resultado = await sessao.execute(
        select(Negocio)
        .where(Negocio.slug == slug)
        .options(joinedload(Negocio.servicos), with_loader_criteria(Servico, Servico.ativo))
    )
    negocio = resultado.unique().scalar_one_or_none()
    if negocio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Página não encontrada.")
    return NegocioPublicoSaida.model_validate(negocio).model_copy(
        update={"token_formulario": gerar_token_formulario(slug)}
    )


@rotas.get("/logo", response_class=Response, responses={200: {"content": {"image/*": {}}}})
async def obter_logo(slug: SlugNaRota, sessao: SessaoLeitura):
    logo = await sessao.scalar(select(LogoNegocio).join(Negocio).where(Negocio.slug == slug))
    if logo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Foto não encontrada.")
    return Response(
        logo.dados,
        media_type=logo.tipo_conteudo,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@rotas.get("/horarios-livres", response_model=HorariosLivresSaida)
async def obter_horarios_livres(
    slug: SlugNaRota,
    sessao: SessaoLeitura,
    requisicao: Request,
    servico_id: ServicosNaConsulta,
    dia: date,
):
    linhas = (
        await sessao.execute(
            consulta_servicos_ativos(slug, servico_id)
            .add_columns(HorarioFuncionamento.abre_as, HorarioFuncionamento.fecha_as)
            .outerjoin(
                HorarioFuncionamento,
                and_(
                    HorarioFuncionamento.negocio_id == Servico.negocio_id,
                    HorarioFuncionamento.dia_semana == dia.weekday(),
                ),
            )
        )
    ).all()
    servicos = na_ordem_pedida({linha[0] for linha in linhas}, servico_id)
    if servicos is None:
        raise SERVICO_NAO_ENCONTRADO

    negocio = servicos[0].negocio
    duracao = sum(s.duracao_minutos for s in servicos)
    expediente = sorted({(abre, fecha) for _, abre, fecha in linhas if abre is not None})
    horarios = await horarios_do_dia(sessao, negocio, duracao, dia, expediente=expediente)
    fuso = ZoneInfo(negocio.fuso_horario)

    agora = datetime.now(UTC)
    if not horarios and agora.astimezone(fuso).date() <= dia:
        await registrar(
            sessao,
            negocio.id,
            chave_visitante(ip_do_cliente(requisicao), agora.date()),
            OrigemDemanda.DIA,
            perda_do_dia(dia, fuso, expediente, duracao, agora),
        )
    return HorariosLivresSaida(
        data=dia,
        servicos=[s.id for s in servicos],
        duracao_minutos=duracao,
        horarios=[h.astimezone(fuso) for h in horarios],
    )


MAXIMO_DIAS_CONSULTADOS = 62
MAXIMO_SUGESTOES_DE_FRASE = 3


@rotas.get("/dias", response_model=DiasLivresSaida)
async def obter_dias_livres(
    slug: SlugNaRota,
    sessao: SessaoLeitura,
    servico_id: ServicosNaConsulta,
    de: date,
    quantidade: Annotated[int, Query(ge=1, le=MAXIMO_DIAS_CONSULTADOS)] = 28,
):
    servicos = await _servicos_ativos(sessao, slug, servico_id)
    negocio = servicos[0].negocio
    duracao = sum(s.duracao_minutos for s in servicos)
    fuso = ZoneInfo(negocio.fuso_horario)
    agora = datetime.now(UTC)
    hoje = agora.astimezone(fuso).date()
    ultimo = hoje + timedelta(days=obter_configuracao().janela_reserva_dias)
    dias = [de + timedelta(days=i) for i in range(quantidade)]
    consultaveis = [d for d in dias if hoje <= d <= ultimo]
    if not consultaveis:
        return DiasLivresSaida(dias=[DiaLivre(data=d, livres=0) for d in dias])

    expedientes = await expedientes_da_semana(sessao, negocio.id)
    janela = Intervalo(
        limites_do_dia(consultaveis[0], fuso).inicio, limites_do_dia(consultaveis[-1], fuso).fim
    )
    ocupados = await intervalos_ocupados(sessao, negocio.id, janela)
    return DiasLivresSaida(
        dias=[
            DiaLivre(
                data=d,
                livres=len(
                    horarios_reservaveis(
                        d, fuso, expedientes.get(d.weekday(), []), duracao, ocupados, agora
                    )
                )
                if hoje <= d <= ultimo
                else 0,
            )
            for d in dias
        ]
    )


@rotas.get("/sugestoes", response_model=SugestoesSaida)
async def sugerir_frases(slug: SlugNaRota, sessao: SessaoLeitura, servico_id: ServicosNaConsulta):
    servicos = await _servicos_ativos(sessao, slug, servico_id)
    negocio = servicos[0].negocio
    duracao = sum(s.duracao_minutos for s in servicos)
    fuso = ZoneInfo(negocio.fuso_horario)
    agora = datetime.now(UTC)
    hoje = agora.astimezone(fuso).date()
    candidatas = frases_candidatas(hoje)

    expedientes = await expedientes_da_semana(sessao, negocio.id)
    janela = Intervalo(
        limites_do_dia(candidatas[0][0], fuso).inicio, limites_do_dia(candidatas[-1][0], fuso).fim
    )
    ocupados = await intervalos_ocupados(sessao, negocio.id, janela)

    validas: list[tuple[date, str]] = []
    for dia, frase in candidatas:
        desejo = entender(frase, hoje)
        if desejo is None or dia not in desejo.dias:
            continue
        inicios = horarios_reservaveis(
            dia, fuso, expedientes.get(dia.weekday(), []), duracao, ocupados, agora
        )
        if any(combina(i.astimezone(fuso).time(), desejo) for i in inicios):
            validas.append((dia, frase))

    escolhidas, dias_usados = [], set()
    for dia, frase in validas:
        if dia not in dias_usados and len(escolhidas) < MAXIMO_SUGESTOES_DE_FRASE:
            escolhidas.append(frase)
            dias_usados.add(dia)
    for _, frase in validas:
        if frase not in escolhidas and len(escolhidas) < MAXIMO_SUGESTOES_DE_FRASE:
            escolhidas.append(frase)
    return SugestoesSaida(sugestoes=escolhidas)


@rotas.get("/busca", response_model=BuscaSaida)
async def buscar_horarios(
    slug: SlugNaRota,
    sessao: SessaoLeitura,
    requisicao: Request,
    servico_id: ServicosNaConsulta,
    frase: Annotated[str, Query(min_length=1, max_length=80)],
):
    servicos = await _servicos_ativos(sessao, slug, servico_id)
    negocio = servicos[0].negocio
    duracao = sum(s.duracao_minutos for s in servicos)
    fuso = ZoneInfo(negocio.fuso_horario)
    agora = datetime.now(UTC)
    hoje = agora.astimezone(fuso).date()

    desejo = entender(frase, hoje)
    if desejo is None:
        return BuscaSaida(entendido=False)
    ultimo = hoje + timedelta(days=obter_configuracao().janela_reserva_dias)
    dias = [d for d in desejo.dias if d <= ultimo]
    busca = BuscaSaida(
        entendido=True, rotulo_dia=desejo.rotulo_dia, rotulo_horario=desejo.rotulo_horario
    )
    if not dias:
        return busca

    expedientes = await expedientes_da_semana(sessao, negocio.id)
    janela = Intervalo(limites_do_dia(dias[0], fuso).inicio, limites_do_dia(dias[-1], fuso).fim)
    ocupados = await intervalos_ocupados(sessao, negocio.id, janela)

    por_dia = MAXIMO_SUGESTOES if len(dias) == 1 else 3
    for dia in dias:
        expediente = expedientes.get(dia.weekday(), [])
        inicios = [
            h.astimezone(fuso)
            for h in horarios_reservaveis(dia, fuso, expediente, duracao, ocupados, agora)
        ]
        compativeis = sorted(
            (h for h in inicios if combina(h.time(), desejo)),
            key=lambda h: distancia(h.time(), desejo),
        )
        busca.horarios.extend(sorted(compativeis[:por_dia]))
        if len(busca.horarios) >= MAXIMO_SUGESTOES:
            break
    busca.horarios = busca.horarios[:MAXIMO_SUGESTOES]

    if not busca.horarios:
        await registrar(
            sessao,
            negocio.id,
            chave_visitante(ip_do_cliente(requisicao), agora.date()),
            OrigemDemanda.BUSCA,
            perdas_da_busca(desejo, dias, fuso, expedientes, duracao, agora),
        )
    return busca


def _http(erro: ErroReserva | ErroAntifraude) -> HTTPException:
    situacao = erro.situacao if isinstance(erro, ErroAntifraude) else status.HTTP_409_CONFLICT
    return HTTPException(situacao, erro.detalhe)


@rotas.post(
    "/agendamentos",
    response_model=ReservaSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limite_reserva)],
)
async def reservar(slug: SlugNaRota, dados: ReservaEntrada, sessao: Sessao, requisicao: Request):
    try:
        conferir_formulario(slug, dados.token_formulario, dados.site)
        servico = await travar_servico(sessao, slug, dados.servico_id)
        if servico is None:
            raise SERVICO_NAO_ENCONTRADO
        (agendamento,) = await reservar_em_sequencia(
            sessao,
            [(servico, dados.nome_cliente)],
            inicio=dados.inicio,
            email_cliente=dados.email_cliente,
            telefone_cliente=dados.telefone_cliente,
            conexao=hash_da_conexao(ip_do_cliente(requisicao)),
        )
    except (ErroReserva, ErroAntifraude) as erro:
        raise _http(erro) from None
    return agendamento


@rotas.post(
    "/agendamentos/grupo",
    response_model=GrupoSaida,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limite_reserva)],
)
async def reservar_em_grupo(
    slug: SlugNaRota, dados: GrupoEntrada, sessao: Sessao, requisicao: Request
):
    try:
        conferir_formulario(slug, dados.token_formulario, dados.site)
        servicos = await travar_servicos(sessao, slug, [p.servico_id for p in dados.pessoas])
        if servicos is None:
            raise SERVICO_NAO_ENCONTRADO
        agendamentos = await reservar_em_sequencia(
            sessao,
            [(servico, p.nome_cliente) for servico, p in zip(servicos, dados.pessoas, strict=True)],
            inicio=dados.inicio,
            email_cliente=dados.email_cliente,
            telefone_cliente=dados.telefone_cliente,
            conexao=hash_da_conexao(ip_do_cliente(requisicao)),
        )
    except (ErroReserva, ErroAntifraude) as erro:
        raise _http(erro) from None
    return GrupoSaida(grupo=agendamentos[0].grupo, agendamentos=agendamentos)
