"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";

const perguntas = [
  {
    pergunta: "Isso é um produto de verdade?",
    resposta:
      "É um projeto de portfólio de código aberto, feito para mostrar como um sistema de agendamento real se comporta. Tudo funciona de ponta a ponta, mas não há empresa nem cobrança por trás.",
  },
  {
    pergunta: "Como ele impede dois clientes no mesmo horário?",
    resposta:
      "Cada reserva trava a linha do negócio no banco, confere se o horário continua livre e só então grava. Se mesmo assim duas gravações se cruzarem, uma restrição de exclusão no PostgreSQL recusa a segunda. A página Como foi feito tem um teste ao vivo que envia 20 pedidos de uma vez.",
  },
  {
    pergunta: "Preciso criar conta para testar o painel?",
    resposta:
      "Não. O botão Ver demo entra numa barbearia de exemplo, com agenda preenchida. Os dados da demo voltam ao estado original todos os dias.",
  },
  {
    pergunta: "O cliente precisa baixar algum aplicativo?",
    resposta:
      "Não. Ele abre o link do negócio no navegador, escolhe o serviço e o horário e recebe um link para remarcar ou cancelar.",
  },
];

export function Perguntas() {
  const [aberta, setAberta] = useState<number | null>(0);
  const id = useId();

  return (
    <div className="divide-y divide-line overflow-hidden rounded-panel border border-line">
      {perguntas.map(({ pergunta, resposta }, i) => {
        const expandida = aberta === i;
        return (
          <div key={pergunta}>
            <h3>
              <button
                type="button"
                aria-expanded={expandida}
                aria-controls={`${id}-${i}`}
                onClick={() => setAberta(expandida ? null : i)}
                className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left text-[15px] font-medium transition-colors hover:bg-fg/[0.03] sm:px-6"
              >
                {pergunta}
                <Plus
                  className={`size-4 shrink-0 text-muted transition-transform duration-300 ease-(--ease-out) ${expandida ? "rotate-45" : ""}`}
                />
              </button>
            </h3>
            <div
              id={`${id}-${i}`}
              role="region"
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-(--ease-out) ${expandida ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl px-5 pb-5 text-[15px] leading-relaxed text-muted sm:px-6">
                  {resposta}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
