from app.dados_demo import DOMINIO_FICTICIO, SLUGS_COM_PAINEL_PUBLICO
from app.esquemas import AgendamentoSaida
from app.modelos import Agendamento


def ocultar_email(email: str) -> str:
    usuario, _, dominio = email.partition("@")
    return f"{usuario[:1]}***@{dominio}"


def ocultar_telefone(telefone: str) -> str:
    digitos = "".join(c for c in telefone if c.isdigit())
    return "*" * (len(digitos) - 2) + digitos[-2:]


def ocultar_nome(nome: str) -> str:
    partes = nome.split()
    return partes[0] if len(partes) == 1 else f"{partes[0]} {partes[-1][0]}."


def contato_visivel(
    slug: str, nome: str, email: str | None, telefone: str | None
) -> tuple[str, str | None, str | None]:
    if slug not in SLUGS_COM_PAINEL_PUBLICO or (email or "").endswith(DOMINIO_FICTICIO):
        return nome, email, telefone
    return (
        ocultar_nome(nome),
        ocultar_email(email) if email else None,
        ocultar_telefone(telefone) if telefone else None,
    )


def para_saida(agendamento: Agendamento, slug: str) -> AgendamentoSaida:
    saida = AgendamentoSaida.model_validate(agendamento)
    nome, email, telefone = contato_visivel(
        slug, saida.nome_cliente, saida.email_cliente, saida.telefone_cliente
    )
    return saida.model_copy(
        update={"nome_cliente": nome, "email_cliente": email, "telefone_cliente": telefone}
    )
