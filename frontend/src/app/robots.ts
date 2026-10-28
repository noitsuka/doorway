import type { MetadataRoute } from "next";

import { urlDoSite } from "@/lib/site";

export default function robos(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/painel", "/agendamento/"] },
    sitemap: `${urlDoSite()}/sitemap.xml`,
  };
}
