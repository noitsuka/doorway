"use client";

import { useLayoutEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

export function NumeroAnimado({
  valor,
  formatar = String,
  desdeZero = false,
}: {
  valor: number;
  formatar?: (valor: number) => string;
  desdeZero?: boolean;
}) {
  const elemento = useRef<HTMLSpanElement>(null);
  const anterior = useRef(desdeZero ? 0 : valor);
  const reduzir = useReducedMotion();

  useLayoutEffect(() => {
    const de = anterior.current;
    anterior.current = valor;
    const alvo = elemento.current;
    if (!alvo) return;
    if (reduzir || de === valor) {
      alvo.textContent = formatar(valor);
      return;
    }
    alvo.textContent = formatar(de);
    const controle = animate(de, valor, {
      duration: 0.7,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (atual) => {
        alvo.textContent = formatar(Math.round(atual));
      },
    });
    return () => controle.stop();
  }, [valor, formatar, reduzir]);

  return (
    <span ref={elemento} className="tabular">
      {formatar(valor)}
    </span>
  );
}
