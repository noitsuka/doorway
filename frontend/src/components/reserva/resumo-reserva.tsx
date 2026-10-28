import { AnimatePresence, motion } from "motion/react";

import { NumeroAnimado } from "@/components/numero-animado";
import { dataLonga, duracao, hora, preco } from "@/lib/formatacao";
import type { Servico } from "@/lib/tipos";

export type Pessoa = { nome: string; servico: Servico };

function emSequencia(horario: string, pessoas: Pessoa[]) {
  let cursor = new Date(horario).getTime();
  return pessoas.map((pessoa) => {
    const inicio = new Date(cursor).toISOString();
    cursor += pessoa.servico.duracao_minutos * 60_000;
    return { ...pessoa, inicio, fim: new Date(cursor).toISOString() };
  });
}

export function ResumoReserva({
  pessoas,
  horario,
  fuso,
}: {
  pessoas: Pessoa[];
  horario?: string;
  fuso: string;
}) {
  const emGrupo = pessoas.length > 1;
  const minutos = pessoas.reduce((soma, p) => soma + p.servico.duracao_minutos, 0);
  const total = pessoas.reduce((soma, p) => soma + p.servico.preco_centavos, 0);
  const linhas = emGrupo
    ? [
        ["Pessoas", String(pessoas.length)],
        ["Duração total", duracao(minutos)],
        ["Data", horario && dataLonga(horario, fuso)],
      ]
    : [
        ["Serviço", pessoas[0]?.servico.nome],
        ["Duração", pessoas[0] && duracao(minutos)],
        ["Data", horario && dataLonga(horario, fuso)],
        ["Horário", horario && hora(horario, fuso)],
      ];
  const sequencia = horario ? emSequencia(horario, pessoas) : undefined;

  return (
    <div className="rounded-panel border border-line bg-raised p-6 shadow-2">
      <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">Resumo</p>
      <dl className="mt-5 space-y-3.5 text-[15px]">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-4">
            <dt className="text-muted">{rotulo}</dt>
            <dd
              className={`text-right font-medium first-letter:uppercase ${valor ? "" : "text-faint"}`}
            >
              {valor || "-"}
            </dd>
          </div>
        ))}
      </dl>

      <AnimatePresence initial={false}>
        {emGrupo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <ol className="mt-5 space-y-2 border-t border-line pt-4">
              {pessoas.map((p, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-[11px] font-semibold text-accent">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{p.nome || "Sem nome"}</span>{" "}
                    <span className="text-muted">· {p.servico.nome}</span>
                  </span>
                  <span className="font-mono text-muted tabular">
                    {sequencia ? hora(sequencia[i].inicio, fuso) : "--:--"}
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="my-5 border-t border-dashed border-line-strong" />
      <div className="flex items-baseline justify-between">
        <span className="text-muted">Total</span>
        <span className="font-display text-3xl font-medium tracking-tight">
          {pessoas.length ? <NumeroAnimado valor={total} formatar={preco} /> : "-"}
        </span>
      </div>
      <p className="mt-3 text-[13px] text-faint">Pagamento direto no local.</p>
    </div>
  );
}
