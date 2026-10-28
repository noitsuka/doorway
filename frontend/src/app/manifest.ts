import type { MetadataRoute } from "next";

export default function manifesto(): MetadataRoute.Manifest {
  return {
    name: "Doorway",
    short_name: "Doorway",
    description: "Agendamento online para quem atende com hora marcada.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
