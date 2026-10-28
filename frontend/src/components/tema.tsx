"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const CHAVE = "doorway.tema";
type Tema = "claro" | "escuro";

export const scriptDoTema = `(function(){try{var t=localStorage.getItem("${CHAVE}");if(t!=="claro"&&t!=="escuro"){t="escuro"}document.documentElement.dataset.tema=t}catch(e){}})()`;

const ouvintes = new Set<() => void>();

function atual(): Tema {
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

function inscrever(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.dataset.trocandoTema = "";
  raiz.dataset.tema = tema;
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {}
  ouvintes.forEach((ouvinte) => ouvinte());
  requestAnimationFrame(() => requestAnimationFrame(() => delete raiz.dataset.trocandoTema));
}

export function AlternarTema({ className = "" }: { className?: string }) {
  const tema = useSyncExternalStore(inscrever, atual, () => "escuro" as Tema);
  const proximo: Tema = tema === "escuro" ? "claro" : "escuro";

  return (
    <button
      type="button"
      onClick={() => aplicar(proximo)}
      aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
      className={`relative grid size-10 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg ${className}`}
    >
      <Sun className="size-[18px] animate-icon-in dark:hidden" />
      <Moon className="hidden size-[18px] animate-icon-in dark:block" />
    </button>
  );
}
