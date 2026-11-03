import type { Metadata } from "next";

import { MolduraDoPainel } from "./moldura";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export const instant = false;

export default function LayoutDoPainel({ children }: LayoutProps<"/painel">) {
  return <MolduraDoPainel>{children}</MolduraDoPainel>;
}
