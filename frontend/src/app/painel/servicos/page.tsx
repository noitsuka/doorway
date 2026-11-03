import type { Metadata } from "next";

import { PaginaDeServicos } from "./servicos";

export const metadata: Metadata = { title: "Serviços" };

export const instant = false;

export default function Rota() {
  return <PaginaDeServicos />;
}
