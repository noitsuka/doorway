import type { Metadata } from "next";
import { Suspense } from "react";

import { Carregando } from "@/components/ui";
import { FluxoGestao } from "./fluxo-gestao";

export const metadata: Metadata = {
  title: "Seu agendamento",
  robots: { index: false, follow: false },
};

export default function PaginaDeGestao({ params }: PageProps<"/agendamento/[token]">) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center">
          <Carregando />
        </div>
      }
    >
      <FluxoGestao params={params} />
    </Suspense>
  );
}
