"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus, UserRound, UsersRound, X } from "lucide-react";

import { duracao, preco } from "@/lib/formatacao";
import type { Acompanhante, Servico } from "@/lib/tipos";
import { erroNome } from "@/lib/validacao";

const MAXIMO_ACOMPANHANTES = 3;

export function errosDosAcompanhantes(acompanhantes: Acompanhante[]) {
  return Object.fromEntries(
    acompanhantes.flatMap((a) => {
      const erro = erroNome(a.nome);
      return erro ? [[a.chave, erro]] : [];
    }),
  ) as Record<string, string>;
}

const classeDoCampo =
  "h-11 w-full min-w-0 rounded-control border bg-canvas px-3.5 text-base transition-[border-color,box-shadow] placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none";

export function Acompanhantes({
  servicos,
  servico,
  valor,
  aoMudar,
  erros,
}: {
  servicos: Servico[];
  servico: Servico;
  valor: Acompanhante[];
  aoMudar: (acompanhantes: Acompanhante[]) => void;
  erros: Record<string, string>;
}) {
  function atualizar(chave: string, mudanca: Partial<Acompanhante>) {
    aoMudar(valor.map((a) => (a.chave === chave ? { ...a, ...mudanca } : a)));
  }

  function adicionar() {
    aoMudar([...valor, { chave: crypto.randomUUID(), nome: "", servico }]);
  }

  if (valor.length === 0) {
    return (
      <button
        type="button"
        onClick={adicionar}
        className="group -mt-6 flex w-full items-center gap-4 rounded-panel border border-dashed border-line-strong bg-raised/60 p-4 text-left transition-[border-color,background-color] hover:border-fg/35 hover:bg-raised sm:p-5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <UsersRound className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Agendar para mais pessoas</span>
          <span className="mt-0.5 block text-sm text-muted">
            Adicione até 3 pessoas, cada uma com o seu serviço, em horários seguidos.
          </span>
        </span>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors group-hover:border-fg/30 group-hover:text-fg">
          <Plus className="size-4" />
        </span>
      </button>
    );
  }

  return (
    <section className="animate-surgir">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Outras pessoas</h2>
        <p className="mt-1 text-sm text-muted">
          Os atendimentos ficam em sequência, a partir do horário escolhido. Até 4 pessoas.
        </p>
      </div>

      <ul className="mt-5 space-y-2">
        <li className="flex items-center gap-3 rounded-control border border-line bg-raised px-4 py-3">
          <UserRound className="size-4 shrink-0 text-muted" />
          <span className="font-medium">Você</span>
          <span className="ml-auto truncate text-sm text-muted">
            {servico.nome} · {duracao(servico.duracao_minutos)}
          </span>
        </li>
        <AnimatePresence initial={false}>
          {valor.map((a, indice) => (
            <motion.li
              key={a.chave}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-control border border-line bg-raised p-3">
                <div className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    aria-label={`Nome da pessoa ${indice + 2}`}
                    placeholder="Nome"
                    autoComplete="off"
                    value={a.nome}
                    maxLength={120}
                    onChange={(e) => atualizar(a.chave, { nome: e.target.value })}
                    aria-invalid={erros[a.chave] ? true : undefined}
                    className={`${classeDoCampo} col-span-2 sm:col-span-1 ${erros[a.chave] ? "border-danger" : "border-line-strong"}`}
                  />
                  <select
                    aria-label={`Serviço da pessoa ${indice + 2}`}
                    value={a.servico.id}
                    onChange={(e) =>
                      atualizar(a.chave, {
                        servico: servicos.find((s) => s.id === Number(e.target.value))!,
                      })
                    }
                    className={`${classeDoCampo} border-line-strong pr-2`}
                  >
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} · {preco(s.preco_centavos)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => aoMudar(valor.filter((x) => x.chave !== a.chave))}
                    aria-label={`Remover pessoa ${indice + 2}`}
                    className="grid size-11 place-items-center rounded-control text-faint transition-colors hover:bg-fg/[0.06] hover:text-fg"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {erros[a.chave] && (
                  <p className="mt-1.5 text-[13px] text-danger">{erros[a.chave]}</p>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {valor.length < MAXIMO_ACOMPANHANTES && (
        <button
          type="button"
          onClick={adicionar}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
        >
          <Plus className="size-4" /> Adicionar pessoa
        </button>
      )}
    </section>
  );
}
