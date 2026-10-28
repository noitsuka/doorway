"use client";

import { useRouter } from "next/navigation";
import { type ComponentProps } from "react";

import { notificar } from "@/components/notificacao";
import { Botao } from "@/components/ui";
import { textoDoErro } from "@/lib/api";
import { entrarNaDemo } from "@/lib/demo";
import { useOcupado } from "@/lib/use-ocupado";

export function BotaoDemo({
  children = "Abrir painel demo",
  ...props
}: Omit<ComponentProps<typeof Botao>, "onClick" | "carregando">) {
  const router = useRouter();
  const [carregando, setCarregando] = useOcupado();

  async function abrir() {
    setCarregando(true);
    try {
      await entrarNaDemo();
      router.push("/painel");
    } catch (erro) {
      notificar(textoDoErro(erro), "erro");
      setCarregando(false);
    }
  }

  return (
    <Botao {...props} carregando={carregando} onClick={abrir}>
      {children}
    </Botao>
  );
}
