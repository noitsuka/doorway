"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";

import { BotaoDemo } from "@/components/botao-demo";
import { Aviso, Botao, Campo } from "@/components/ui";
import { api, ErroApi, sessao, textoDoErro } from "@/lib/api";
import { useOcupado } from "@/lib/use-ocupado";

export default function PaginaDeEntrada() {
  const router = useRouter();
  const [erro, setErro] = useState<string>();
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useOcupado();

  async function entrar(email: string, senha: string) {
    setCarregando(true);
    setErro(undefined);
    setCampos({});
    try {
      const { token_acesso } = await api<{ token_acesso: string }>("/autenticacao/login", {
        method: "POST",
        json: { email, senha },
      });
      sessao.salvar(token_acesso);
      router.push("/painel");
    } catch (e) {
      setErro(textoDoErro(e));
      if (e instanceof ErroApi) setCampos(e.campos);
      setCarregando(false);
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    entrar(String(dados.get("email")), String(dados.get("senha")));
  }

  return (
    <div className="animate-enter">
      <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
        Bem-vindo de volta.
      </h1>
      <p className="mt-3 text-lg text-muted">Entre para ver a sua agenda.</p>

      <form onSubmit={aoEnviar} className="mt-10 space-y-5" noValidate>
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          erro={campos.email}
        />
        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          erro={campos.senha}
        />
        {erro && !Object.keys(campos).length && <Aviso>{erro}</Aviso>}
        <Botao type="submit" tamanho="grande" carregando={carregando} className="w-full">
          Entrar <ArrowRight className="size-4" />
        </Botao>
      </form>

      <div className="my-8 flex items-center gap-4 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
      </div>

      <BotaoDemo variante="contorno" tamanho="grande" className="w-full">
        Entrar com a conta demo, sem cadastro
      </BotaoDemo>

      <p className="mt-10 text-center text-[15px] text-muted">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="-my-2 inline-block py-2 font-semibold text-fg underline-offset-4 hover:underline"
        >
          Crie a sua grátis
        </Link>
      </p>
    </div>
  );
}
