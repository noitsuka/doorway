"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarPlus, Copy, Settings2 } from "lucide-react";

import { notificar } from "@/components/notificacao";
import { Botao } from "@/components/ui";
import { urlGoogleAgenda, urlOutlook } from "@/lib/calendario";
import { dataLonga, hora, preco } from "@/lib/formatacao";
import type { AgendamentoReservado, NegocioPublico } from "@/lib/tipos";

const SUAVE = [0.23, 1, 0.32, 1] as const;

function urlDeGestao(agendamento: AgendamentoReservado) {
  return typeof window === "undefined"
    ? ""
    : `${window.location.origin}/agendamento/${agendamento.token_gestao}`;
}

export function Confirmacao({
  agendamentos,
  negocio,
}: {
  agendamentos: AgendamentoReservado[];
  negocio: NegocioPublico;
}) {
  const fuso = negocio.fuso_horario;
  const [primeiro] = agendamentos;
  const ultimo = agendamentos[agendamentos.length - 1];
  const emGrupo = agendamentos.length > 1;
  const total = agendamentos.reduce((soma, a) => soma + a.servico.preco_centavos, 0);
  const bloco: AgendamentoReservado = emGrupo
    ? {
        ...primeiro,
        fim: ultimo.fim,
        servico: { ...primeiro.servico, nome: `Reserva para ${agendamentos.length} pessoas` },
      }
    : primeiro;
  const links = agendamentos.map((a) => `${a.nome_cliente}: ${urlDeGestao(a)}`).join("\n");
  const detalhes = `Para cancelar ou remarcar:\n${emGrupo ? links : urlDeGestao(primeiro)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(emGrupo ? links : urlDeGestao(primeiro));
      notificar(emGrupo ? "Links copiados." : "Link copiado.");
    } catch {
      notificar("Não foi possível copiar o link.", "erro");
    }
  }

  return (
    <section className="mx-auto max-w-lg">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, filter: "blur(6px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.45, ease: SUAVE }}
        className="grid size-14 place-items-center rounded-full bg-ok-soft text-ok"
      >
        <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, rotate: -12 }}
            animate={{ pathLength: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.45, ease: SUAVE }}
          />
        </svg>
      </motion.div>
      <h2 className="mt-6 font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
        Agendamento confirmado
      </h2>
      <p className="mt-3 text-lg text-muted first-letter:uppercase">
        {emGrupo ? `Reserva para ${agendamentos.length} pessoas, ` : ""}
        {dataLonga(primeiro.inicio, fuso)}, às {hora(primeiro.inicio, fuso)}, em{" "}
        <span className="font-semibold text-fg">{negocio.nome}</span>.
      </p>

      <div className="relative mt-10 rounded-panel border border-line bg-raised shadow-2">
        <div className="p-6 sm:p-7">
          <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
            {emGrupo ? "Reserva em grupo" : `Agendamento #${String(primeiro.id).padStart(5, "0")}`}
          </p>
          <p className="mt-4 font-display text-2xl font-medium tracking-tight">
            {emGrupo ? `${agendamentos.length} pessoas` : primeiro.servico.nome}
          </p>
          <p className="mt-1 text-muted first-letter:uppercase">
            {dataLonga(primeiro.inicio, fuso)}
          </p>
        </div>
        <div className="relative flex items-center">
          <span className="absolute -left-3 size-6 rounded-full border border-line bg-canvas" />
          <span className="mx-5 h-px flex-1 border-t border-dashed border-line-strong" />
          <span className="absolute -right-3 size-6 rounded-full border border-line bg-canvas" />
        </div>
        {emGrupo && (
          <ol className="space-y-3 px-6 pt-6 sm:px-7">
            {agendamentos.map((a, i) => (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.35, ease: SUAVE }}
                className="flex items-center gap-3 text-[15px]"
              >
                <span className="font-mono text-sm text-muted tabular">{hora(a.inicio, fuso)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{a.nome_cliente}</span>{" "}
                  <span className="text-muted">· {a.servico.nome}</span>
                </span>
                <Link
                  href={`/agendamento/${a.token_gestao}`}
                  className="shrink-0 text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Gerenciar
                </Link>
              </motion.li>
            ))}
          </ol>
        )}
        <div className="grid grid-cols-3 gap-4 p-6 sm:p-7">
          {[
            ["Início", hora(primeiro.inicio, fuso)],
            ["Fim", hora(ultimo.fim, fuso)],
            ["Valor", preco(total)],
          ].map(([rotulo, valor]) => (
            <div key={rotulo}>
              <p className="text-xs text-faint">{rotulo}</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular">{valor}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        <a
          href={urlGoogleAgenda(bloco, negocio.nome, detalhes)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-fg px-5 text-[15px] font-medium text-canvas transition-colors hover:bg-fg/90"
        >
          <CalendarPlus className="size-4" /> Google Agenda
        </a>
        <a
          href={urlOutlook(bloco, negocio.nome, detalhes)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-strong bg-raised px-5 text-[15px] font-medium transition-colors hover:border-fg/30 hover:bg-surface"
        >
          <CalendarPlus className="size-4" /> Outlook
        </a>
      </div>

      <div className="mt-6 rounded-panel border border-line p-5">
        <p className="flex items-center gap-2 font-semibold">
          <Settings2 className="size-4" /> Remarcar ou cancelar
        </p>
        <p className="mt-1 text-sm text-muted">
          {emGrupo
            ? "Cada pessoa tem um link próprio para remarcar ou cancelar. Não é preciso criar conta."
            : "Use o link do agendamento para remarcar ou cancelar. Não é preciso criar conta."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {!emGrupo && (
            <Link
              href={`/agendamento/${primeiro.token_gestao}`}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-control bg-accent px-4 font-semibold text-accent-fg transition-[filter] hover:brightness-110"
            >
              Gerenciar agendamento
            </Link>
          )}
          <Botao variante="contorno" onClick={copiar} className={emGrupo ? "w-full" : ""}>
            <Copy className="size-4" /> {emGrupo ? "Copiar os links" : "Copiar link"}
          </Botao>
        </div>
      </div>
    </section>
  );
}
