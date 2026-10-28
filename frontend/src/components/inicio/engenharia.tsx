import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { IconeGitHub } from "@/components/redes";
import { URL_GITHUB } from "@/lib/demo";

const indicadores = [
  {
    valor: "200+",
    rotulo: "testes automatizados",
    detalhe: "Unidade, API, propriedades, fuzzing e um teste de caos com 60 clientes.",
  },
  {
    valor: "1 de 20",
    rotulo: "reservas aceitas",
    detalhe: "Vinte pedidos simultâneos para o mesmo horário: só um passa, direto no banco.",
  },
  {
    valor: "9",
    rotulo: "decisões documentadas",
    detalhe: "Cada escolha de arquitetura tem um registro com contexto e consequências.",
  },
  {
    valor: "CI",
    rotulo: "a cada envio",
    detalhe: "Testes no PostgreSQL, checagem de migrações, lint, tipos e build.",
  },
];

export function Engenharia() {
  return (
    <div>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {indicadores.map((item) => (
          <div key={item.rotulo} className="rounded-panel border border-line bg-raised p-5">
            <dt className="text-sm text-muted">{item.rotulo}</dt>
            <dd className="mt-1 font-display text-4xl font-medium tracking-[-0.03em]">
              {item.valor}
            </dd>
            <dd className="mt-3 text-sm leading-relaxed text-muted">{item.detalhe}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <a
          href={URL_GITHUB}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-strong bg-raised px-5 text-[15px] font-medium transition-colors hover:border-fg/30 hover:bg-surface"
        >
          <IconeGitHub className="size-4" /> Ver o código
        </a>
        <Link
          href="/como-foi-feito"
          className="group inline-flex h-11 items-center justify-center gap-1.5 px-2 text-[15px] text-link"
        >
          Como foi feito
          <ArrowRight className="size-4 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
