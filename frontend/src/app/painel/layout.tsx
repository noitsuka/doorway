import { MolduraDoPainel } from "./moldura";

export const instant = false;

export default function LayoutDoPainel({ children }: LayoutProps<"/painel">) {
  return <MolduraDoPainel>{children}</MolduraDoPainel>;
}
