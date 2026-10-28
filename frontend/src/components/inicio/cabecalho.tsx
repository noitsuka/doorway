import Link from "next/link";
import { BotaoDemo } from "@/components/botao-demo";
import { LinkAncora } from "@/components/link-ancora";
import { Logo } from "@/components/logo";
import { IconeGitHub } from "@/components/redes";
import { AlternarTema } from "@/components/tema";
import { URL_GITHUB } from "@/lib/demo";

const secoes = [
  { id: "produto", rotulo: "Produto" },
  { id: "exemplos", rotulo: "Exemplos" },
  { id: "recursos", rotulo: "Recursos" },
];

const classeDoLink =
  "rounded-control px-3 py-1.5 transition-colors duration-150 hover:bg-fg/[0.05] hover:text-fg";

export function Cabecalho() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-panel border border-line bg-canvas/85 px-3 shadow-1 backdrop-blur-md sm:px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 text-sm font-medium text-muted lg:flex">
            {secoes.map((secao) => (
              <LinkAncora key={secao.id} secao={secao.id} className={classeDoLink}>
                {secao.rotulo}
              </LinkAncora>
            ))}
            <Link href="/como-foi-feito" className={classeDoLink}>
              Como foi feito
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={URL_GITHUB}
            target="_blank"
            rel="noreferrer"
            aria-label="Código-fonte no GitHub"
            className="hidden size-9 place-items-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg sm:grid"
          >
            <IconeGitHub className="size-[17px]" />
          </a>
          <AlternarTema className="size-9 rounded-control" />
          <Link
            href="/entrar"
            className="inline-flex h-9 items-center rounded-control border border-fg/10 px-3 text-sm font-medium text-muted transition-colors hover:text-fg"
          >
            Entrar
          </Link>
          <div className="hidden sm:block">
            <BotaoDemo tamanho="pequeno" className="h-9 px-3.5 text-sm">
              Ver demo
            </BotaoDemo>
          </div>
        </div>
      </div>
    </header>
  );
}
