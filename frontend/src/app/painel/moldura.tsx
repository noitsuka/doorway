"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  LogOut,
  Palette,
  Radar,
  Scissors,
} from "lucide-react";

import { Logo, LogoMarca } from "@/components/logo";
import { AlternarTema } from "@/components/tema";
import { notificar } from "@/components/notificacao";
import { Carregando } from "@/components/ui";
import { api, sessao } from "@/lib/api";
import { EMAIL_DEMO } from "@/lib/demo";
import type { Usuario } from "@/lib/tipos";
import { ContextoAtualizarSessao, ContextoSessao } from "./sessao";

const navegacao = [
  { href: "/painel", rotulo: "Agenda", Icone: CalendarDays },
  { href: "/painel/servicos", rotulo: "Serviços", Icone: Scissors },
  { href: "/painel/horarios", rotulo: "Horários", Icone: Clock3 },
  { href: "/painel/demanda", rotulo: "Demanda", Icone: Radar },
  { href: "/painel/pagina", rotulo: "Página", Icone: Palette },
] as const;

export function MolduraDoPainel({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const caminho = usePathname();
  const [usuario, setUsuario] = useState<Usuario>();

  useEffect(() => {
    if (!sessao.obter()) {
      router.replace("/entrar");
      return;
    }
    api<Usuario>("/autenticacao/eu")
      .then(setUsuario)
      .catch(() => {
        sessao.limpar();
        router.replace("/entrar");
      });
  }, [router]);

  if (!usuario) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Carregando />
      </div>
    );
  }

  function sair() {
    sessao.limpar();
    router.push("/");
  }

  return (
    <ContextoSessao value={usuario}>
      <ContextoAtualizarSessao value={setUsuario}>
        <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
          <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-4 lg:py-6">
            <Logo className="px-2" />
            <nav className="mt-10 space-y-1">
              {navegacao.map(({ href, rotulo, Icone }) => {
                const ativo = caminho === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex h-11 items-center gap-3 rounded-control px-3 text-[15px] font-medium transition-colors ${
                      ativo ? "bg-fg text-canvas" : "text-muted hover:bg-fg/[0.05] hover:text-fg"
                    }`}
                  >
                    <Icone className="size-[18px]" />
                    {rotulo}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto space-y-4">
              <CartaoCompartilhar slug={usuario.negocio.slug} />
              <div className="flex items-center gap-2 rounded-panel border border-line py-2 pr-2 pl-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{usuario.nome}</p>
                  <p className="truncate text-xs text-muted">{usuario.negocio.nome}</p>
                </div>
                <AlternarTema className="size-9" />
                <button
                  onClick={sair}
                  aria-label="Sair"
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-fg/[0.06] hover:text-fg"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </aside>

          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-canvas/85 px-5 backdrop-blur-md lg:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link href="/" aria-label="Doorway, página inicial" className="shrink-0">
                <LogoMarca className="size-8" />
              </Link>
              <Link href="/painel" className="truncate font-bold tracking-tight">
                {usuario.negocio.nome}
              </Link>
            </div>
            <div className="flex items-center">
              <AlternarTema />
              <button
                onClick={sair}
                aria-label="Sair"
                className="grid size-10 place-items-center rounded-full text-muted hover:bg-fg/[0.06]"
              >
                <LogOut className="size-[18px]" />
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl px-5 pt-8 pb-32 sm:px-8 lg:pt-12 lg:pb-16">
            {usuario.email === EMAIL_DEMO && (
              <p className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-control border border-line bg-surface px-4 py-2.5 text-sm text-muted">
                <span className="font-mono text-xs tracking-[0.12em] text-accent uppercase">
                  Demo
                </span>
                Você está numa conta de demonstração. Pode mexer à vontade: tudo volta ao original
                todo dia.
              </p>
            )}
            {children}
          </main>

          <nav
            aria-label="Navegação"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-canvas/90 px-2 pt-2 pb-safe backdrop-blur-md lg:hidden"
          >
            {navegacao.map(({ href, rotulo, Icone }) => {
              const ativo = caminho === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={ativo ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 rounded-control py-1.5 text-[11px] font-medium ${
                    ativo ? "text-fg" : "text-faint"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                      ativo ? "bg-fg text-canvas" : ""
                    }`}
                  >
                    <Icone className="size-[18px]" />
                  </span>
                  {rotulo}
                </Link>
              );
            })}
          </nav>
        </div>
      </ContextoAtualizarSessao>
    </ContextoSessao>
  );
}

function CartaoCompartilhar({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
      setCopiado(true);
      notificar("Link copiado. Agora é só mandar para os clientes.");
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      notificar("Não foi possível copiar o link.", "erro");
    }
  }

  return (
    <div className="rounded-panel bg-inverse p-4 text-on-inverse">
      <p className="text-xs opacity-60">Sua página pública</p>
      <p className="mt-1 truncate font-mono text-sm">/{slug}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={copiar}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-on-inverse text-xs font-semibold text-inverse"
        >
          {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copiado ? "Copiado" : "Copiar link"}
        </button>
        <a
          href={`/${slug}`}
          target="_blank"
          aria-label="Abrir página pública"
          className="grid size-9 place-items-center rounded-lg bg-on-inverse/10 hover:bg-on-inverse/20"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}
