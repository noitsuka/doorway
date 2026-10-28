import { ImageResponse } from "next/og";

import { carregarNegocio } from "@/lib/negocio-publico";
import { MarcaSvg, PAPEL, SUAVE, TINTA } from "@/lib/previa";

export const alt = "Página de agendamento no Doorway";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ImagemDoNegocio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const negocio = await carregarNegocio(slug);
  const cor = negocio?.cor_marca ?? "#2e4cf6";
  const nome = negocio?.nome ?? "Agende online";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPEL,
        color: TINTA,
      }}
    >
      <div style={{ height: 18, background: cor }} />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
        }}
      >
        <div style={{ display: "flex" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {negocio?.categoria && (
              <div
                style={{ fontSize: 26, letterSpacing: 3, textTransform: "uppercase", color: cor }}
              >
                {negocio.categoria}
              </div>
            )}
            <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -3 }}>{nome}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 44, color: "#d4d4d4", maxWidth: 980 }}>
            {negocio?.chamada ?? "Escolha o serviço e o melhor horário para você."}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "flex",
                padding: "18px 34px",
                borderRadius: 16,
                background: cor,
                color: "#fff",
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              Agende online
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 28,
                color: SUAVE,
              }}
            >
              <MarcaSvg tamanho={40} /> doorway
            </div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
