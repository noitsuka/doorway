import type { Metadata } from "next";

import { PaginaDaMarca } from "./pagina";

export const metadata: Metadata = { title: "Página" };

export const instant = false;

export default function Rota() {
  return <PaginaDaMarca />;
}
