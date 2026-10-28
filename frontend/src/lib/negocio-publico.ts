import { cacheLife } from "next/cache";

import { URL_API } from "@/lib/api";
import type { NegocioPublico } from "@/lib/tipos";

export async function carregarNegocio(slug: string): Promise<NegocioPublico | null> {
  "use cache";
  cacheLife("minutes");
  try {
    const resposta = await fetch(`${URL_API}/publico/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(4000),
    });
    return resposta.ok ? ((await resposta.json()) as NegocioPublico) : null;
  } catch {
    return null;
  }
}
