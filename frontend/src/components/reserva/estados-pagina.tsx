import Link from "next/link";

import { LogoMarca } from "@/components/logo";
import { Botao, Esqueleto } from "@/components/ui";

export function EsqueletoDaPagina() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-8" aria-busy>
      <div className="flex items-center gap-5">
        <Esqueleto className="size-20 rounded-panel" />
        <div className="space-y-3">
          <Esqueleto className="h-4 w-28" />
          <Esqueleto className="h-10 w-64" />
        </div>
      </div>
      <div className="mt-14 grid gap-2.5 sm:grid-cols-2 lg:max-w-[calc(100%-24rem)]">
        {Array.from({ length: 4 }, (_, i) => (
          <Esqueleto key={i} className="h-20 rounded-panel" />
        ))}
      </div>
    </div>
  );
}

export function Indisponivel({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMarca className="mx-auto size-14" />
        <h1 className="mt-8 font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
          Serviço indisponível no momento
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-lg text-muted">
          Não foi possível carregar a página. Tente de novo em alguns segundos.
        </p>
        <Botao tamanho="grande" className="mt-8" onClick={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      </div>
    </div>
  );
}

export function NaoEncontrado() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMarca className="mx-auto size-14" />
        <h1 className="mt-8 font-display text-5xl font-medium tracking-[-0.03em]">
          Página não encontrada
        </h1>
        <p className="mt-3 text-lg text-muted">Verifique o endereço com o estabelecimento.</p>
        <Link href="/" className="mt-8 inline-block font-semibold text-accent">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
