"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";

import { ResumoReserva } from "@/components/reserva/resumo-reserva";
import { Aviso, Botao, Campo } from "@/components/ui";
import { api, ErroApi, textoDoErro } from "@/lib/api";
import {
  erroEmail,
  erroNome,
  erroTelefone,
  formatarTelefone,
  telefoneParaApi,
} from "@/lib/validacao";
import type { Acompanhante, AgendamentoReservado, ReservaEmGrupo, Servico } from "@/lib/tipos";

const HORARIO_OCUPADO = "Esse horário acabou de ser reservado. Escolha outro.";

export function EtapaDados({
  slug,
  tokenFormulario,
  fuso,
  servico,
  acompanhantes,
  horario,
  aoVoltar,
  aoPerderHorario,
  aoReservar,
}: {
  slug: string;
  tokenFormulario: string;
  fuso: string;
  servico: Servico;
  acompanhantes: Acompanhante[];
  horario: string;
  aoVoltar: () => void;
  aoPerderHorario: () => void;
  aoReservar: (agendamentos: AgendamentoReservado[]) => void;
}) {
  const [erro, setErro] = useState<string>();
  const [camposDaApi, setCamposDaApi] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);
  const [valores, setValores] = useState({ nome: "", email: "", telefone: "" });
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  const problemas = {
    nome: erroNome(valores.nome),
    email: erroEmail(valores.email),
    telefone: erroTelefone(valores.telefone),
  };
  const mostrado = (campo: keyof typeof problemas, campoDaApi: string) =>
    (tocados[campo] ? problemas[campo] : undefined) ?? camposDaApi[campoDaApi];

  function definir(campo: keyof typeof valores, valor: string) {
    setValores((v) => ({ ...v, [campo]: campo === "telefone" ? formatarTelefone(valor) : valor }));
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const invalidos = (Object.keys(problemas) as (keyof typeof problemas)[]).filter(
      (c) => problemas[c],
    );
    if (invalidos.length) {
      setTocados({ nome: true, email: true, telefone: true });
      const formulario = evento.currentTarget;
      invalidos.forEach((campo, i) => {
        const entrada = formulario.elements.namedItem(campo) as HTMLInputElement | null;
        if (i === 0) entrada?.focus();
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          entrada?.animate(
            [
              { transform: "none" },
              { transform: "translateX(-4px)" },
              { transform: "translateX(4px)" },
              { transform: "translateX(-3px)" },
              { transform: "none" },
            ],
            { duration: 360, easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)" },
          );
        }
      });
      return;
    }
    setCarregando(true);
    setErro(undefined);
    setCamposDaApi({});
    const armadilha = (evento.currentTarget.elements.namedItem("site") as HTMLInputElement).value;
    const contato = {
      token_formulario: tokenFormulario,
      site: armadilha || null,
      inicio: horario,
      email_cliente: valores.email.trim() || null,
      telefone_cliente: telefoneParaApi(valores.telefone),
    };
    try {
      if (acompanhantes.length) {
        const reserva = await api<ReservaEmGrupo>(`/publico/${slug}/agendamentos/grupo`, {
          method: "POST",
          json: {
            ...contato,
            pessoas: [
              { nome_cliente: valores.nome.trim(), servico_id: servico.id },
              ...acompanhantes.map((a) => ({
                nome_cliente: a.nome.trim(),
                servico_id: a.servico.id,
              })),
            ],
          },
        });
        aoReservar(reserva.agendamentos);
      } else {
        const agendamento = await api<AgendamentoReservado>(`/publico/${slug}/agendamentos`, {
          method: "POST",
          json: { ...contato, servico_id: servico.id, nome_cliente: valores.nome.trim() },
        });
        aoReservar([agendamento]);
      }
    } catch (e) {
      if (e instanceof ErroApi && e.detalhe === HORARIO_OCUPADO) {
        aoPerderHorario();
        return;
      }
      setErro(textoDoErro(e));
      if (e instanceof ErroApi) setCamposDaApi(e.campos);
      setCarregando(false);
    }
  }

  return (
    <section>
      <button
        onClick={aoVoltar}
        className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <h2 className="text-xl font-semibold tracking-tight">Seus dados</h2>
      <p className="mt-2 text-muted">
        {acompanhantes.length
          ? "O contato informado vale para todas as pessoas da reserva."
          : "Informe seus dados para confirmar o agendamento."}
      </p>

      <div className="mt-6 lg:hidden">
        <ResumoReserva
          pessoas={[{ nome: valores.nome.trim() || "Você", servico }, ...acompanhantes]}
          horario={horario}
          fuso={fuso}
        />
      </div>

      <form onSubmit={aoEnviar} className="mt-8 space-y-5" noValidate>
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Site
            <input name="site" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <Campo
          rotulo="Nome"
          name="nome"
          autoComplete="name"
          required
          value={valores.nome}
          onChange={(e) => definir("nome", e.target.value)}
          onBlur={() => setTocados((t) => ({ ...t, nome: true }))}
          erro={mostrado("nome", "nome_cliente")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="WhatsApp ou telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 91234-5678"
            required
            dica="Com DDD. Usado só para contato sobre o agendamento."
            value={valores.telefone}
            onChange={(e) => definir("telefone", e.target.value)}
            onBlur={() => setTocados((t) => ({ ...t, telefone: true }))}
            erro={mostrado("telefone", "telefone_cliente")}
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            dica="Opcional."
            value={valores.email}
            onChange={(e) => definir("email", e.target.value)}
            onBlur={() => setTocados((t) => ({ ...t, email: true }))}
            erro={mostrado("email", "email_cliente")}
          />
        </div>
        {erro && !Object.keys(camposDaApi).length && <Aviso>{erro}</Aviso>}
        <Botao
          type="submit"
          variante="destaque"
          tamanho="grande"
          carregando={carregando}
          className="w-full"
        >
          Confirmar agendamento
        </Botao>
        <p className="text-center text-xs text-faint">
          Ao confirmar, você concorda com a{" "}
          <Link href="/privacidade" className="underline underline-offset-2 hover:text-fg">
            política de privacidade
          </Link>
          .
        </p>
      </form>
    </section>
  );
}
