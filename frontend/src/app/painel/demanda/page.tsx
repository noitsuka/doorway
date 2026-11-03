import type { Metadata } from "next";

import { PaginaDaDemanda } from "./demanda";

export const metadata: Metadata = { title: "Demanda" };

export const instant = false;

export default function Rota() {
  return <PaginaDaDemanda />;
}
