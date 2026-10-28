"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import { Aviso, Botao, Campo } from "@/components/ui";
import { api, ErroApi, sessao, textoDoErro } from "@/lib/api";
import { useOcupado } from "@/lib/use-ocupado";
import { erroEmail, erroNome } from "@/lib/validacao";

function paraSlug(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function PaginaDeCadastro() {
  const router = useRouter();
  const idSlug = useId();
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [erro, setErro] = useState<string>();
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useOcupado();

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const local = {
      nome: erroNome(String(dados.get("nome") ?? "")),
      email: erroEmail(String(dados.get("email") ?? "")),
      senha:
        String(dados.get("senha") ?? "").length < 8 ? "Use pelo menos 8 caracteres." : undefined,
    };
    const invalidos = Object.fromEntries(Object.entries(local).filter(([, v]) => v)) as Record<
      string,
      string
    >;
    if (Object.keys(invalidos).length) {
      setCampos(invalidos);
      return;
    }
    setCarregando(true);
    setErro(undefined);
    setCampos({});
    try {
      const { token_acesso } = await api<{ token_acesso: string }>("/autenticacao/cadastro", {
        method: "POST",
        json: {
          nome_negocio: nomeNegocio,
          slug,
          fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone,
          nome: dados.get("nome"),
          email: dados.get("email"),
          senha: dados.get("senha"),
        },
      });
      sessao.salvar(token_acesso);
      router.push("/painel/servicos?boas-vindas=1");
    } catch (e) {
      setErro(textoDoErro(e));
      if (e instanceof ErroApi) setCampos(e.campos);
      setCarregando(false);
    }
  }

  const erroSlug = campos.slug;

  return (
    <div className="animate-enter">
      <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
        Crie sua página.
      </h1>
      <p className="mt-3 text-lg text-muted">Grátis, sem cartão. Pronta em dois minutos.</p>

      <form onSubmit={aoEnviar} className="mt-10 space-y-5" noValidate>
        <Campo
          rotulo="Nome do negócio"
          value={nomeNegocio}
          onChange={(e) => {
            setNomeNegocio(e.target.value);
            if (!slugEditado) setSlug(paraSlug(e.target.value));
          }}
          placeholder="Barbearia do Zé"
          autoComplete="organization"
          required
          erro={campos.nome_negocio}
        />

        <div>
          <label htmlFor={idSlug} className="mb-2 block text-sm font-medium">
            Seu link
          </label>
          <div
            className={`flex h-12 items-center overflow-hidden rounded-control border bg-raised transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 ${
              erroSlug ? "border-danger" : "border-line-strong hover:border-fg/30"
            }`}
          >
            <span className="flex h-full items-center border-r border-line bg-fg/[0.03] pr-1 pl-4 font-mono text-sm text-muted">
              doorway.app/
            </span>
            <input
              id={idSlug}
              value={slug}
              onChange={(e) => {
                setSlugEditado(true);
                setSlug(paraSlug(e.target.value));
              }}
              aria-invalid={erroSlug ? true : undefined}
              aria-describedby={`${idSlug}-nota`}
              autoCapitalize="none"
              spellCheck={false}
              required
              className="h-full min-w-0 flex-1 bg-transparent pr-4 pl-2 font-mono text-base focus:outline-none"
            />
          </div>
          <p
            id={`${idSlug}-nota`}
            className={`mt-1.5 text-[13px] ${erroSlug ? "text-danger" : "text-muted"}`}
          >
            {erroSlug ?? "É o endereço que você vai mandar para os clientes."}
          </p>
        </div>

        <Campo rotulo="Seu nome" name="nome" autoComplete="name" required erro={campos.nome} />
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          erro={campos.email}
        />
        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          dica="Pelo menos 8 caracteres."
          required
          erro={campos.senha}
        />
        {erro && !Object.keys(campos).length && <Aviso>{erro}</Aviso>}
        <Botao
          type="submit"
          variante="destaque"
          tamanho="grande"
          carregando={carregando}
          className="w-full"
        >
          Criar minha página <ArrowRight className="size-4" />
        </Botao>
      </form>

      <p className="mt-10 text-center text-[15px] text-muted">
        Já tem conta?{" "}
        <Link
          href="/entrar"
          className="-my-2 inline-block py-2 font-semibold text-fg underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
