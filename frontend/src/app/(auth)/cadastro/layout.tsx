import type { Metadata } from "next";

export const metadata: Metadata = { title: "Criar conta" };

export default function LayoutDeCadastro({ children }: LayoutProps<"/cadastro">) {
  return children;
}
