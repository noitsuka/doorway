import type { MetadataRoute } from "next";

import { EXEMPLOS } from "@/lib/exemplos";
import { urlDoSite } from "@/lib/site";

export default function mapaDoSite(): MetadataRoute.Sitemap {
  const base = urlDoSite();
  return ["", "/como-foi-feito", "/privacidade", ...EXEMPLOS.map((e) => `/${e.slug}`)].map(
    (caminho) => ({ url: `${base}${caminho}` }),
  );
}
