import secrets
from datetime import UTC, date, datetime, time
from enum import StrEnum

from sqlalchemy import (
    DDL,
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    SmallInteger,
    String,
    Time,
    TypeDecorator,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class DataHoraUTC(TypeDecorator):
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, valor: datetime | None, dialect):
        if valor is None:
            return None
        if valor.tzinfo is None:
            raise ValueError("data e hora sem fuso")
        return valor.astimezone(UTC)

    def process_result_value(self, valor: datetime | None, dialect):
        if valor is None:
            return None
        return valor.replace(tzinfo=UTC) if valor.tzinfo is None else valor.astimezone(UTC)


COR_MARCA_PADRAO = "#2e4cf6"


def novo_token() -> str:
    return secrets.token_urlsafe(32)


class Base(DeclarativeBase):
    pass


class Negocio(Base):
    __tablename__ = "negocios"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_negocios_slug"),
        UniqueConstraint("token_agenda", name="uq_negocios_token_agenda"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(60))
    fuso_horario: Mapped[str] = mapped_column(String(64))
    categoria: Mapped[str | None] = mapped_column(String(40))
    chamada: Mapped[str | None] = mapped_column(String(160))
    cor_marca: Mapped[str] = mapped_column(String(7), default=COR_MARCA_PADRAO)
    versao_logo: Mapped[int | None]
    token_agenda: Mapped[str] = mapped_column(String(64), default=novo_token)
    criado_em: Mapped[datetime] = mapped_column(DataHoraUTC, server_default=func.now())

    servicos: Mapped[list["Servico"]] = relationship(
        back_populates="negocio", order_by="Servico.nome"
    )


class LogoNegocio(Base):
    __tablename__ = "logos_negocio"

    negocio_id: Mapped[int] = mapped_column(
        ForeignKey("negocios.id", ondelete="CASCADE"), primary_key=True
    )
    tipo_conteudo: Mapped[str] = mapped_column(String(16))
    dados: Mapped[bytes] = mapped_column(LargeBinary)


class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = (UniqueConstraint("email", name="uq_usuarios_email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id", ondelete="CASCADE"))
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254))
    hash_senha: Mapped[str] = mapped_column(String(255))
    criado_em: Mapped[datetime] = mapped_column(DataHoraUTC, server_default=func.now())

    negocio: Mapped[Negocio] = relationship()


class Servico(Base):
    __tablename__ = "servicos"
    __table_args__ = (
        CheckConstraint("duracao_minutos > 0", name="ck_servicos_duracao_positiva"),
        CheckConstraint("preco_centavos >= 0", name="ck_servicos_preco_nao_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(
        ForeignKey("negocios.id", ondelete="CASCADE"), index=True
    )
    nome: Mapped[str] = mapped_column(String(120))
    duracao_minutos: Mapped[int]
    preco_centavos: Mapped[int]
    ativo: Mapped[bool] = mapped_column(default=True)

    negocio: Mapped[Negocio] = relationship(back_populates="servicos")


class HorarioFuncionamento(Base):
    __tablename__ = "horarios_funcionamento"
    __table_args__ = (
        CheckConstraint("dia_semana BETWEEN 0 AND 6", name="ck_horarios_funcionamento_dia_semana"),
        CheckConstraint("abre_as < fecha_as", name="ck_horarios_funcionamento_intervalo"),
        UniqueConstraint(
            "negocio_id", "dia_semana", "abre_as", name="uq_horarios_funcionamento_inicio"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(
        ForeignKey("negocios.id", ondelete="CASCADE"), index=True
    )
    dia_semana: Mapped[int]
    abre_as: Mapped[time] = mapped_column(Time)
    fecha_as: Mapped[time] = mapped_column(Time)

    negocio: Mapped[Negocio] = relationship()


class StatusAgendamento(StrEnum):
    CONFIRMADO = "confirmado"
    CANCELADO = "cancelado"


class Agendamento(Base):
    __tablename__ = "agendamentos"
    __table_args__ = (
        CheckConstraint("inicio < fim", name="ck_agendamentos_intervalo"),
        Index("ix_agendamentos_negocio_inicio", "negocio_id", "inicio"),
        Index("ix_agendamentos_negocio_cliente", "negocio_id", "telefone_cliente"),
        UniqueConstraint("token_gestao", name="uq_agendamentos_token_gestao"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id", ondelete="CASCADE"))
    servico_id: Mapped[int] = mapped_column(ForeignKey("servicos.id", ondelete="RESTRICT"))
    nome_cliente: Mapped[str] = mapped_column(String(120))
    email_cliente: Mapped[str | None] = mapped_column(String(254))
    telefone_cliente: Mapped[str | None] = mapped_column(String(32))
    token_gestao: Mapped[str] = mapped_column(String(64), default=novo_token)
    grupo: Mapped[str | None] = mapped_column(String(32))
    conexao: Mapped[str | None] = mapped_column(String(16))
    inicio: Mapped[datetime] = mapped_column(DataHoraUTC)
    fim: Mapped[datetime] = mapped_column(DataHoraUTC)
    status: Mapped[StatusAgendamento] = mapped_column(
        Enum(
            StatusAgendamento,
            native_enum=False,
            length=16,
            values_callable=lambda e: [m.value for m in e],
        ),
        default=StatusAgendamento.CONFIRMADO,
    )
    criado_em: Mapped[datetime] = mapped_column(DataHoraUTC, server_default=func.now())

    servico: Mapped[Servico] = relationship()
    negocio: Mapped[Negocio] = relationship()


class Bloqueio(Base):
    __tablename__ = "bloqueios"
    __table_args__ = (Index("ix_bloqueios_negocio_id", "negocio_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id", ondelete="CASCADE"))
    email: Mapped[str | None] = mapped_column(String(254))
    telefone: Mapped[str | None] = mapped_column(String(15))
    criado_em: Mapped[datetime] = mapped_column(DataHoraUTC, server_default=func.now())


class OrigemDemanda(StrEnum):
    DIA = "dia"
    BUSCA = "busca"


class MotivoDemanda(StrEnum):
    FECHADO = "fechado"
    LOTADO = "lotado"


def _enum_texto(enum: type[StrEnum]) -> Enum:
    return Enum(enum, native_enum=False, length=8, values_callable=lambda e: [m.value for m in e])


class DemandaPerdida(Base):
    __tablename__ = "demandas_perdidas"
    __table_args__ = (
        CheckConstraint("hora BETWEEN 0 AND 23", name="ck_demandas_perdidas_hora"),
        UniqueConstraint(
            "negocio_id",
            "dia",
            "hora",
            "origem",
            "visitante",
            name="uq_demandas_perdidas_visitante",
            postgresql_nulls_not_distinct=True,
        ),
        Index("ix_demandas_perdidas_negocio_criado_em", "negocio_id", "criado_em"),
    )

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer(), "sqlite"), primary_key=True
    )
    negocio_id: Mapped[int] = mapped_column(ForeignKey("negocios.id", ondelete="CASCADE"))
    dia: Mapped[date] = mapped_column(Date)
    hora: Mapped[int | None] = mapped_column(SmallInteger)
    origem: Mapped[OrigemDemanda] = mapped_column(_enum_texto(OrigemDemanda))
    motivo: Mapped[MotivoDemanda] = mapped_column(_enum_texto(MotivoDemanda))
    visitante: Mapped[str] = mapped_column(String(16))
    criado_em: Mapped[datetime] = mapped_column(DataHoraUTC, server_default=func.now())

    negocio: Mapped[Negocio] = relationship()


class LimiteRequisicao(Base):
    __tablename__ = "limites_requisicao"
    __table_args__ = (Index("ix_limites_requisicao_expira_em", "expira_em"),)

    chave: Mapped[str] = mapped_column(String(200), primary_key=True)
    janela: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)
    acessos: Mapped[int]
    expira_em: Mapped[int] = mapped_column(BigInteger)


RESTRICAO_SEM_SOBREPOSICAO = """
ALTER TABLE agendamentos ADD CONSTRAINT ex_agendamentos_sem_sobreposicao
EXCLUDE USING gist (negocio_id WITH =, tstzrange(inicio, fim) WITH &&)
WHERE (status <> 'cancelado')
"""

event.listen(
    Base.metadata,
    "before_create",
    DDL("CREATE EXTENSION IF NOT EXISTS btree_gist").execute_if(dialect="postgresql"),
)
event.listen(
    Agendamento.__table__,
    "after_create",
    DDL(RESTRICAO_SEM_SOBREPOSICAO).execute_if(dialect="postgresql"),
)
