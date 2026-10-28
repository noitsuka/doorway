"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck } from "lucide-react";

type Notificacao = { id: number; mensagem: string; tom: "sucesso" | "erro" };

let notificacoes: Notificacao[] = [];
let proximoId = 0;
const ouvintes = new Set<() => void>();

function avisarOuvintes() {
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function notificar(mensagem: string, tom: Notificacao["tom"] = "sucesso") {
  const id = ++proximoId;
  notificacoes = [...notificacoes.slice(-2), { id, mensagem, tom }];
  avisarOuvintes();
  setTimeout(() => {
    notificacoes = notificacoes.filter((n) => n.id !== id);
    avisarOuvintes();
  }, 3600);
}

const inscrever = (ouvinte: () => void) => {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
};
const nenhuma: Notificacao[] = [];

export function Notificacoes() {
  const itens = useSyncExternalStore(
    inscrever,
    () => notificacoes,
    () => nenhuma,
  );

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-safe sm:items-end sm:pr-6"
    >
      <AnimatePresence initial={false}>
        {itens.map((n) => (
          <motion.div
            key={n.id}
            role="status"
            layout
            initial={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-panel border border-line-strong bg-inverse px-4 py-3 text-sm text-on-inverse shadow-2"
          >
            {n.tom === "sucesso" ? (
              <CircleCheck className="size-4 shrink-0 text-ok" />
            ) : (
              <CircleAlert className="size-4 shrink-0 text-danger" />
            )}
            {n.mensagem}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
