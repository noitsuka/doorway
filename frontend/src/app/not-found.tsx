import Link from "next/link";

import { LogoMarca } from "@/components/logo";
import { LinkBotao } from "@/components/ui";

export default function NaoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMarca className="mx-auto size-14" />
        <p className="mt-10 font-mono text-sm text-accent">404</p>
        <h1 className="mt-3 text-5xl font-bold tracking-[-0.05em] sm:text-6xl">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
          O endereço pode ter mudado. Confira o link ou volte para o início.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkBotao href="/" tamanho="grande">
            Ir para o início
          </LinkBotao>
          <Link
            href="/barbearia-ferraz"
            className="inline-flex h-11 items-center justify-center px-5 text-[15px] font-medium text-muted transition-colors hover:text-fg"
          >
            Ver uma página de exemplo
          </Link>
        </div>
      </div>
    </main>
  );
}
