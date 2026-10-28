"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { rolarAte } from "@/lib/rolagem";

export function LinkAncora({
  secao,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onClick"> & { secao?: string }) {
  const caminho = usePathname();
  const destino = secao ? `/#${secao}` : "/";

  function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
    const abreEmOutraAba = evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button;
    if (caminho !== "/" || abreEmOutraAba || !rolarAte(secao)) return;
    evento.preventDefault();
    history.replaceState(null, "", destino);
  }

  return <Link {...props} href={destino} onClick={aoClicar} />;
}
