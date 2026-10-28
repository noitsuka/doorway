"use client";

import { LogoMarca } from "@/components/logo";
import { Botao, LinkBotao } from "@/components/ui";

export default function PaginaDeErro({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMarca className="mx-auto size-14" />
        <p className="mt-10 font-mono text-sm text-accent">erro</p>
        <h1 className="mt-3 text-5xl font-bold tracking-[-0.05em] sm:text-6xl">Algo deu errado.</h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
          A página não carregou. Tente de novo em alguns segundos.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Botao tamanho="grande" onClick={reset}>
            Tentar de novo
          </Botao>
          <LinkBotao href="/" variante="fantasma" tamanho="grande">
            Ir para o início
          </LinkBotao>
        </div>
      </div>
    </main>
  );
}
