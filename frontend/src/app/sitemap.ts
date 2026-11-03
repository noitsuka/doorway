import type { MetadataRoute } from "next";

import { BARBEARIA } from "@/lib/exemplos";
import { urlDoSite } from "@/lib/site";

export default function mapaDoSite(): MetadataRoute.Sitemap {
  const base = urlDoSite();
  return ["", "/como-foi-feito", "/privacidade", `/${BARBEARIA.slug}`].map((caminho) => ({
    url: `${base}${caminho}`,
  }));
}
