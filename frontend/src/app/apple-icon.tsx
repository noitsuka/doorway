import { ImageResponse } from "next/og";

import { MarcaSvg, PAPEL } from "@/lib/previa";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function IconeApple() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: PAPEL,
      }}
    >
      <MarcaSvg tamanho={132} raio={14} />
    </div>,
    size,
  );
}
