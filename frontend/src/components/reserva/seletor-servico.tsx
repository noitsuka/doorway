import { Check, Clock3 } from "lucide-react";

import { duracao, preco } from "@/lib/formatacao";
import type { Servico } from "@/lib/tipos";

export function SeletorServico({
  servicos,
  valor,
  aoMudar,
}: {
  servicos: Servico[];
  valor?: Servico;
  aoMudar: (servico: Servico) => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Serviço</h2>
      {servicos.length === 0 ? (
        <p className="mt-5 text-muted">Nenhum serviço disponível no momento.</p>
      ) : (
        <div role="radiogroup" aria-label="Serviço" className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {servicos.map((s) => {
            const selecionado = s.id === valor?.id;
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={selecionado}
                onClick={() => aoMudar(s)}
                className={`group flex items-center gap-4 rounded-panel border p-4 text-left transition-[border-color,background-color,box-shadow] sm:p-5 ${
                  selecionado
                    ? "border-accent bg-accent-soft ring-4 ring-accent/10"
                    : "border-line bg-raised hover:border-fg/25"
                }`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                    selecionado ? "border-accent bg-accent text-accent-fg" : "border-line-strong"
                  }`}
                >
                  {selecionado && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words">{s.nome}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                    <Clock3 className="size-3.5" /> {duracao(s.duracao_minutos)}
                  </span>
                </span>
                <span className="font-mono text-[15px] font-medium tabular">
                  {preco(s.preco_centavos)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
