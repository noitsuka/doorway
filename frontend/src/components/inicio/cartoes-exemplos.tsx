import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EXEMPLOS } from "@/lib/exemplos";
import { dinheiro } from "@/lib/formatacao";

export function CartoesExemplos() {
  return (
    <ul className="-mx-5 no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {EXEMPLOS.map((exemplo) => (
        <li key={exemplo.slug} className="w-[78%] shrink-0 snap-start sm:w-auto">
          <Link
            href={`/${exemplo.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-raised shadow-2 transition-[border-color,transform] duration-300 ease-(--ease-out) hover:-translate-y-0.5 hover:border-line-strong"
          >
            <div
              className="relative flex h-36 flex-col justify-between p-4 text-white"
              style={{ background: exemplo.cor }}
            >
              <p className="font-display text-2xl leading-tight font-medium tracking-[-0.02em]">
                {exemplo.nome}
              </p>
              <ul className="space-y-1 text-[12px]">
                {exemplo.servicos.slice(0, 2).map(([nome, preco]) => (
                  <li
                    key={nome}
                    className="flex justify-between gap-3 border-t border-white/20 pt-1"
                  >
                    <span className="truncate opacity-90">{nome}</span>
                    <span className="font-mono opacity-80">
                      {preco ? dinheiro(preco) : "grátis"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <span className="self-start rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
                {exemplo.categoria}
              </span>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{exemplo.chamada}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-link">
                Abrir página
                <ArrowRight className="size-3.5 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
