"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function Gaveta({
  aberta,
  titulo,
  aoFechar,
  children,
}: {
  aberta: boolean;
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
}) {
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    painel.current?.querySelector<HTMLElement>("input, button, select, textarea")?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", aoTeclar);
      anterior?.focus();
    };
  }, [aberta, aoFechar]);

  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal
      aria-label={titulo}
    >
      <button
        aria-label="Fechar"
        tabIndex={-1}
        onClick={aoFechar}
        className="absolute inset-0 animate-fade bg-black/40 backdrop-blur-[2px]"
      />
      <div
        ref={painel}
        className="relative mt-auto flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-panel border-t border-line bg-surface shadow-3 sm:mt-0 sm:h-full sm:max-h-none sm:max-w-md sm:animate-sheet-left sm:rounded-none sm:border-t-0 sm:border-l"
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pt-2 pb-safe">{children}</div>
      </div>
    </div>
  );
}
