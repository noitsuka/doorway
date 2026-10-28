"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Trash2 } from "lucide-react";

const DESARMAR_MS = 3000;

export function ConfirmarExclusao({
  rotulo,
  aoConfirmar,
  ocupado = false,
}: {
  rotulo: string;
  aoConfirmar: () => void;
  ocupado?: boolean;
}) {
  const [armado, setArmado] = useState(false);

  useEffect(() => {
    if (!armado) return;
    const temporizador = setTimeout(() => setArmado(false), DESARMAR_MS);
    return () => clearTimeout(temporizador);
  }, [armado]);

  return (
    <button
      type="button"
      aria-label={armado ? `Confirmar exclusão de ${rotulo}` : `Excluir ${rotulo}`}
      title={armado ? "Clique de novo para excluir" : `Excluir ${rotulo}`}
      disabled={ocupado}
      onBlur={() => setArmado(false)}
      onClick={() => (armado ? aoConfirmar() : setArmado(true))}
      className={`relative grid h-10 place-items-center overflow-hidden rounded-control transition-[width,background-color,color] duration-300 ease-(--ease-out) disabled:opacity-50 ${
        armado
          ? "w-24 bg-danger-soft text-danger"
          : "w-10 text-muted hover:bg-fg/[0.06] hover:text-danger"
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={armado ? "confirmar" : "parado"}
          initial={{ opacity: 0, filter: "blur(4px)", scale: 0.9 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)", scale: 0.9 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
        >
          {armado ? "Excluir?" : <Trash2 className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
