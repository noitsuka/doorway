import { ImageResponse } from "next/og";

import { LINHA, MarcaSvg, PAPEL, SUAVE, TINTA } from "@/lib/previa";

export const alt = "Doorway: agendamento online sem conflito de horário";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ImagemDeCompartilhamento() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: PAPEL,
        color: TINTA,
        border: `1px solid ${LINHA}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <MarcaSvg tamanho={72} />
        <div style={{ fontSize: 56, fontWeight: 600, letterSpacing: -2 }}>doorway</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 104, fontWeight: 500, letterSpacing: -4, lineHeight: 1 }}>
          Sua agenda,
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 104,
            fontWeight: 500,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          <span style={{ color: SUAVE }}>aberta 24 horas.</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: SUAVE }}>
          Projeto de portfólio · reservas à prova de concorrência · por @noitsuka
        </div>
      </div>
    </div>,
    size,
  );
}
