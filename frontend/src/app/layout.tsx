import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { Notificacoes } from "@/components/notificacao";
import { Provedores } from "@/components/provedores";
import { scriptDoTema } from "@/components/tema";
import { urlDoSite } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(urlDoSite()),
  title: {
    default: "Doorway: agendamento online sem conflito de horário",
    template: "%s · Doorway",
  },
  description:
    "Projeto de portfólio de código aberto: agendamento online para pequenos negócios, sem conflito de horário, com painel em tempo real e página própria.",
  applicationName: "Doorway",
  authors: [{ name: "Gabriel Barreto", url: "https://github.com/noitsuka" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function LayoutRaiz({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Constante do próprio código, sem dado do usuário: não há o que sanitizar. */}
        <script dangerouslySetInnerHTML={{ __html: scriptDoTema }} />
      </head>
      <body className="min-h-dvh">
        <Provedores>{children}</Provedores>
        <Notificacoes />
      </body>
    </html>
  );
}
