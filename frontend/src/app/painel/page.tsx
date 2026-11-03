import type { Metadata } from "next";

import { PaginaDaAgenda } from "./agenda";

export const metadata: Metadata = { title: "Agenda" };

export const instant = false;

export default function Painel() {
  return <PaginaDaAgenda />;
}
