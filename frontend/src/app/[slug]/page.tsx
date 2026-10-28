import type { Metadata } from "next";
import { Suspense } from "react";

import { Carregando } from "@/components/ui";
import { carregarNegocio } from "@/lib/negocio-publico";
import { FluxoAgendamento } from "./fluxo-agendamento";

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const negocio = await carregarNegocio((await params).slug);
  if (!negocio) return { title: "Página não encontrada", robots: { index: false } };
  const servicos = negocio.servicos.map((s) => s.nome.toLowerCase()).slice(0, 3);
  return {
    robots: negocio.slug === "laboratorio" ? { index: false } : undefined,
    title: `${negocio.nome} · agende online`,
    description:
      negocio.chamada ??
      `Agende ${servicos.length ? servicos.join(", ") : "seu horário"} na ${negocio.nome}, direto pelo celular.`,
  };
}

export default function PaginaDeAgendamento({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <Carregando />
        </div>
      }
    >
      <FluxoAgendamento params={params} />
    </Suspense>
  );
}
