import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { LinkAncora } from "@/components/link-ancora";
import { Logo } from "@/components/logo";
import { LinksSociais } from "@/components/redes";
import { URL_AUTOR, URL_GITHUB } from "@/lib/demo";

const DOCUMENTACAO_API = process.env.NEXT_PUBLIC_API_DOCS_URL;

type LinkDoRodape = { href: string; rotulo: string; externo?: boolean; secao?: string };

const colunas: { titulo: string; links: LinkDoRodape[] }[] = [
  {
    titulo: "Produto",
    links: [
      { href: "/#produto", rotulo: "Visão geral", secao: "produto" },
      { href: "/#exemplos", rotulo: "Páginas de exemplo", secao: "exemplos" },
      { href: "/barbearia-ferraz", rotulo: "Agendar como cliente" },
      { href: "/entrar", rotulo: "Entrar" },
    ],
  },
  {
    titulo: "Projeto",
    links: [
      { href: "/como-foi-feito", rotulo: "Como foi feito" },
      { href: URL_GITHUB, rotulo: "Código-fonte", externo: true },
      ...(DOCUMENTACAO_API
        ? [{ href: DOCUMENTACAO_API, rotulo: "Documentação da API", externo: true }]
        : []),
      { href: "/privacidade", rotulo: "Privacidade e termos" },
    ],
  },
];

const classeDoLinkInterno =
  "inline-block py-1.5 text-sm text-muted transition-colors hover:text-fg";

export function Rodape() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 pt-14 pb-10 sm:px-8 md:grid-cols-[1.8fr_1fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Agendamento online para quem atende com hora marcada.
          </p>
          <div className="mt-4 -ml-2.5">
            <LinksSociais />
          </div>
        </div>

        {colunas.map((coluna) => (
          <nav key={coluna.titulo} aria-label={coluna.titulo}>
            <p className="text-xs font-medium text-faint">{coluna.titulo}</p>
            <ul className="mt-4 space-y-0.5">
              {coluna.links.map((link) => (
                <li key={link.rotulo}>
                  {link.externo ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1 py-1.5 text-sm text-muted transition-colors hover:text-fg"
                    >
                      {link.rotulo}
                      <ArrowUpRight className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
                    </a>
                  ) : link.secao ? (
                    <LinkAncora secao={link.secao} className={classeDoLinkInterno}>
                      {link.rotulo}
                    </LinkAncora>
                  ) : (
                    <Link href={link.href} className={classeDoLinkInterno}>
                      {link.rotulo}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-5 text-[13px] text-faint sm:px-8">
          © 2026 Doorway · feito por{" "}
          <a
            href={URL_AUTOR}
            target="_blank"
            rel="noreferrer"
            className="text-muted underline decoration-fg/30 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg"
          >
            @noitsuka
          </a>
        </p>
      </div>
    </footer>
  );
}
