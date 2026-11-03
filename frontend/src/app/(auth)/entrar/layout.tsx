import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default function LayoutDeEntrada({ children }: LayoutProps<"/entrar">) {
  return children;
}
