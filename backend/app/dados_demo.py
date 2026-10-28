import argparse
import asyncio
import random
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import banco
from app.configuracao import obter_configuracao
from app.modelos import (
    Agendamento,
    Bloqueio,
    DemandaPerdida,
    HorarioFuncionamento,
    LogoNegocio,
    MotivoDemanda,
    Negocio,
    OrigemDemanda,
    Servico,
    StatusAgendamento,
    Usuario,
)
from app.seguranca import gerar_hash_senha

FUSO = "America/Sao_Paulo"
SLUG_LABORATORIO = "laboratorio"
SENHA_DEMO = "doorway-demo"

Faixa = tuple[time, time]


def semana(dias: range, *faixas: Faixa) -> dict[int, list[Faixa]]:
    return {dia: list(faixas) for dia in dias}


@dataclass
class Exemplo:
    slug: str
    nome: str
    categoria: str
    chamada: str
    cor_marca: str
    servicos: list[tuple[str, int, int]]
    expediente: dict[int, list[Faixa]]
    ocupacao: float = 0.45
    parcela_mulheres: float = 0.5
    dono: str | None = None
    expediente_extra: dict[int, list[Faixa]] = field(default_factory=dict)


EXEMPLOS = [
    Exemplo(
        slug="barbearia-ferraz",
        nome="Barbearia Ferraz",
        categoria="Barbearia",
        chamada="Corte clássico, barba na navalha e café passado na hora.",
        cor_marca="#b4532a",
        servicos=[
            ("Corte masculino", 30, 5000),
            ("Barba completa", 30, 4000),
            ("Corte + barba", 60, 8500),
            ("Pigmentação", 45, 6000),
            ("Sobrancelha", 15, 2000),
        ],
        expediente=semana(range(5), (time(9), time(12)), (time(13), time(19))),
        expediente_extra={5: [(time(8), time(14))]},
        ocupacao=0.55,
        parcela_mulheres=0.0,
        dono="Thiago Ferraz",
    ),
    Exemplo(
        slug="studio-lume",
        nome="Studio Lume",
        categoria="Estúdio de beleza",
        chamada="Corte, coloração e cuidado para cabelos cacheados.",
        cor_marca="#c2417a",
        servicos=[
            ("Corte feminino", 60, 12000),
            ("Coloração", 120, 26000),
            ("Hidratação", 45, 9000),
            ("Escova", 45, 7000),
            ("Finalização de cachos", 60, 11000),
        ],
        expediente=semana(range(1, 6), (time(10), time(19))),
        parcela_mulheres=0.9,
    ),
    Exemplo(
        slug="clinica-vitta",
        nome="Clínica Vitta",
        categoria="Fisioterapia",
        chamada="Fisioterapia ortopédica e pilates clínico com hora marcada.",
        cor_marca="#0e7c66",
        servicos=[
            ("Avaliação", 50, 15000),
            ("Sessão de fisioterapia", 50, 13000),
            ("Pilates clínico", 55, 11000),
            ("Liberação miofascial", 40, 12000),
        ],
        expediente=semana(range(5), (time(7), time(12)), (time(14), time(20))),
    ),
    Exemplo(
        slug="traco-fino",
        nome="Traço Fino",
        categoria="Estúdio de tatuagem",
        chamada="Fine line, blackwork e flash day. O orçamento também se marca por aqui.",
        cor_marca="#7c3aed",
        servicos=[
            ("Orçamento e desenho", 30, 0),
            ("Flash tattoo", 60, 25000),
            ("Fine line pequena", 90, 38000),
            ("Sessão média", 180, 75000),
            ("Sessão longa", 240, 120000),
        ],
        expediente=semana(range(1, 6), (time(12), time(20))),
        ocupacao=0.4,
        parcela_mulheres=0.6,
    ),
    Exemplo(
        slug=SLUG_LABORATORIO,
        nome="Laboratório de concorrência",
        categoria="Demonstração",
        chamada="Usado pelo teste de concorrência do estudo de caso.",
        cor_marca="#525252",
        servicos=[("Horário de teste", 30, 0)],
        expediente=semana(range(7), (time(8), time(20))),
        ocupacao=0,
    ),
]

SLUGS_COM_PAINEL_PUBLICO = frozenset(e.slug for e in EXEMPLOS if e.dono)
DOMINIO_FICTICIO = "@example.com"

FECHADO, LOTADO = MotivoDemanda.FECHADO, MotivoDemanda.LOTADO
DEMANDA_DEMO = [
    (5, 14, FECHADO, 9),
    (5, 15, FECHADO, 7),
    (5, 16, FECHADO, 4),
    (0, 19, FECHADO, 3),
    (2, 19, FECHADO, 4),
    (3, 19, FECHADO, 5),
    (4, 19, FECHADO, 3),
    (6, None, FECHADO, 5),
    (0, 12, FECHADO, 3),
    (4, 17, LOTADO, 6),
    (4, 18, LOTADO, 4),
    (5, 9, LOTADO, 5),
    (5, 10, LOTADO, 3),
]

MULHERES = [
    "Ana",
    "Beatriz",
    "Camila",
    "Daniela",
    "Eduarda",
    "Fernanda",
    "Helena",
    "Isabela",
    "Juliana",
    "Larissa",
    "Letícia",
    "Luiza",
    "Mariana",
    "Natália",
    "Paula",
    "Renata",
    "Sofia",
    "Valentina",
    "Bianca",
    "Carolina",
]
HOMENS = [
    "Bruno",
    "Carlos",
    "Diego",
    "Felipe",
    "Gabriel",
    "Gustavo",
    "Igor",
    "João",
    "Leonardo",
    "Lucas",
    "Marcos",
    "Mateus",
    "Otávio",
    "Pedro",
    "Rafael",
    "Rodrigo",
    "Thiago",
    "Vinícius",
    "André",
    "Henrique",
]
SOBRENOMES = [
    "Almeida",
    "Araújo",
    "Barbosa",
    "Cardoso",
    "Carvalho",
    "Costa",
    "Dias",
    "Ferreira",
    "Gomes",
    "Lima",
    "Martins",
    "Melo",
    "Moreira",
    "Nascimento",
    "Oliveira",
    "Pereira",
    "Ribeiro",
    "Rocha",
    "Santos",
    "Silva",
    "Souza",
    "Teixeira",
]


def _cliente(sorteio: random.Random, parcela_mulheres: float) -> tuple[str, str, str]:
    primeiro = sorteio.choice(MULHERES if sorteio.random() < parcela_mulheres else HOMENS)
    sobrenome = sorteio.choice(SOBRENOMES)
    simples = f"{primeiro}.{sobrenome}".lower()
    for acentuada, sem_acento in zip("áâãéêíóôõúç", "aaaeeiooouc", strict=True):
        simples = simples.replace(acentuada, sem_acento)
    telefone = f"119{sorteio.randint(1000, 9999)}{sorteio.randint(1000, 9999)}"
    email = f"{simples}{sorteio.randint(1, 99)}{DOMINIO_FICTICIO}"
    return f"{primeiro} {sobrenome}", email, telefone


def _agendamentos(
    exemplo: Exemplo, negocio: Negocio, servicos: list[Servico], hoje: date
) -> list[Agendamento]:
    sorteio = random.Random(f"{exemplo.slug}:{hoje.isoformat()}")
    fuso = ZoneInfo(FUSO)
    expediente = exemplo.expediente | exemplo.expediente_extra
    resultado = []
    for deslocamento in range(-3, 11):
        dia = hoje + timedelta(days=deslocamento)
        for abre, fecha in expediente.get(dia.weekday(), []):
            cursor = datetime.combine(dia, abre, fuso)
            fim = datetime.combine(dia, fecha, fuso)
            while cursor < fim:
                servico = sorteio.choice(servicos)
                duracao = timedelta(minutes=servico.duracao_minutos)
                if cursor + duracao <= fim and sorteio.random() < exemplo.ocupacao:
                    nome, email, telefone = _cliente(sorteio, exemplo.parcela_mulheres)
                    cancelado = sorteio.random() < 0.06
                    resultado.append(
                        Agendamento(
                            negocio=negocio,
                            servico=servico,
                            nome_cliente=nome,
                            email_cliente=email,
                            telefone_cliente=telefone,
                            inicio=cursor.astimezone(UTC),
                            fim=(cursor + duracao).astimezone(UTC),
                            status=StatusAgendamento.CANCELADO
                            if cancelado
                            else StatusAgendamento.CONFIRMADO,
                        )
                    )
                    cursor += duracao
                else:
                    cursor += timedelta(minutes=sorteio.choice((15, 30, 45)))
    return resultado


def _demanda_perdida(exemplo: Exemplo, negocio: Negocio, hoje: date) -> list[DemandaPerdida]:
    sorteio = random.Random(f"demanda:{exemplo.slug}:{hoje.isoformat()}")
    fuso = ZoneInfo(FUSO)
    resultado = []
    for dia_semana, hora, motivo, quantidade in DEMANDA_DEMO:
        for _ in range(quantidade):
            semanas_atras = sorteio.randint(0, 3)
            dia = hoje - timedelta(days=(hoje.weekday() - dia_semana) % 7 + 7 * semanas_atras)
            pedido_em = datetime.combine(
                dia - timedelta(days=sorteio.randint(0, 3)),
                time(sorteio.randint(8, 22), sorteio.randint(0, 59)),
                fuso,
            )
            resultado.append(
                DemandaPerdida(
                    negocio=negocio,
                    dia=dia,
                    hora=hora,
                    origem=OrigemDemanda.DIA if hora is None else OrigemDemanda.BUSCA,
                    motivo=motivo,
                    visitante=f"{sorteio.getrandbits(64):016x}",
                    criado_em=pedido_em.astimezone(UTC),
                )
            )
    return resultado


async def _criar(sessao: AsyncSession, exemplo: Exemplo, hoje: date) -> None:
    negocio = Negocio(
        nome=exemplo.nome,
        slug=exemplo.slug,
        fuso_horario=FUSO,
        categoria=exemplo.categoria,
        chamada=exemplo.chamada,
        cor_marca=exemplo.cor_marca,
    )
    servicos = [
        Servico(negocio=negocio, nome=n, duracao_minutos=d, preco_centavos=p)
        for n, d, p in exemplo.servicos
    ]
    expediente = [
        HorarioFuncionamento(negocio=negocio, dia_semana=dia, abre_as=abre, fecha_as=fecha)
        for dia, faixas in (exemplo.expediente | exemplo.expediente_extra).items()
        for abre, fecha in faixas
    ]
    sessao.add_all([negocio, *servicos, *expediente])
    if exemplo.dono:
        sessao.add(
            Usuario(
                negocio=negocio,
                nome=exemplo.dono,
                email=obter_configuracao().email_demo,
                hash_senha=await gerar_hash_senha(SENHA_DEMO),
            )
        )
    sessao.add_all(_agendamentos(exemplo, negocio, servicos, hoje))
    if exemplo.dono:
        sessao.add_all(_demanda_perdida(exemplo, negocio, hoje))


async def recriar_demo(sessao: AsyncSession) -> None:
    slugs = [e.slug for e in EXEMPLOS]
    ids = select(Negocio.id).where(Negocio.slug.in_(slugs)).scalar_subquery()
    for modelo in (
        Agendamento,
        Bloqueio,
        DemandaPerdida,
        HorarioFuncionamento,
        Servico,
        Usuario,
        LogoNegocio,
    ):
        await sessao.execute(delete(modelo).where(modelo.negocio_id.in_(ids)))
    await sessao.execute(delete(Negocio).where(Negocio.slug.in_(slugs)))
    await sessao.execute(delete(Usuario).where(Usuario.email == obter_configuracao().email_demo))
    hoje = datetime.now(ZoneInfo(FUSO)).date()
    for exemplo in EXEMPLOS:
        await _criar(sessao, exemplo, hoje)
    await sessao.commit()


async def principal(recriar: bool) -> None:
    async with banco.escopo_sessao(banco.SessaoEscrita) as sessao:
        existe = await sessao.scalar(select(Negocio.id).where(Negocio.slug == SLUG_LABORATORIO))
        if existe and not recriar:
            print("os dados da demo já existem (use --recriar para refazer)")
            return
        await recriar_demo(sessao)
    print(f"demo pronta: {obter_configuracao().email_demo} / {SENHA_DEMO}")


if __name__ == "__main__":
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--recriar", action="store_true")
    asyncio.run(principal(argumentos.parse_args().recriar))
