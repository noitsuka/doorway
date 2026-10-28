"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { rolarAte } from "@/lib/rolagem";

export function RolagemSuave({ children }: { children: React.ReactNode }) {
  const moldura = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const secaoInicial = decodeURIComponent(location.hash.slice(1));
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (secaoInicial) rolarAte(secaoInicial, false);
      return;
    }

    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    const suavizador = ScrollSmoother.create({
      wrapper: moldura.current!,
      content: conteudo.current!,
      smooth: 1.1,
      effects: true,
      smoothTouch: false,
    });

    let atualizacao: ReturnType<typeof setTimeout>;
    const observador = new ResizeObserver(() => {
      clearTimeout(atualizacao);
      atualizacao = setTimeout(() => ScrollTrigger.refresh(), 120);
    });
    observador.observe(conteudo.current!);
    if (secaoInicial) rolarAte(secaoInicial, false);

    return () => {
      clearTimeout(atualizacao);
      observador.disconnect();
      suavizador.kill();
    };
  }, []);

  return (
    <div ref={moldura}>
      <div ref={conteudo}>{children}</div>
    </div>
  );
}
