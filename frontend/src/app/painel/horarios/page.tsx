import type { Metadata } from "next";

import { PaginaDeHorarios } from "./horarios";

export const metadata: Metadata = { title: "Horários" };

export const instant = false;

export default function Rota() {
  return <PaginaDeHorarios />;
}
