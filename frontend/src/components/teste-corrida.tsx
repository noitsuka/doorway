"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Play, RotateCcw } from "lucide-react";

import { Botao } from "@/components/ui";
import { api, textoDoErro } from "@/lib/api";
import { URL_GITHUB } from "@/lib/demo";
import { dataLonga, hora } from "@/lib/formatacao";
import type { ResultadoCorrida } from "@/lib/tipos";

const PEDIDOS = 20;

export function TesteCorrida() {
  const [resultado, setResultado] = useState<ResultadoCorrida>();
  const [erro, setErro] = useState<string>();
  const [rodando, setRodando] = useState(false);

  async function rodar() {
    setRodando(true);
    setErro(undefined);
    setResultado(undefined);
    try {
      setResultado(
        await api<ResultadoCorrida>("/demo/corrida", {
          method: "POST",
          json: { pedidos: PEDIDOS },
        }),
      );
    } catch (e) {
      setErro(textoDoErro(e));
    } finally {
      setRodando(false);
    }
  }

  const vencedor = resultado?.tentativas.find((t) => t.aceito);
  const ordenadas = resultado
    ? [...resultado.tentativas].sort((a, b) => a.duracao_ms - b.duracao_ms)
    : [];

  return (
    <div className="rounded-panel border border-line bg-raised p-5 shadow-2 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">Teste ao vivo</p>
          <p className="mt-2 max-w-sm text-lg font-semibold tracking-tight">
            {PEDIDOS} pessoas tentando o mesmo horário, ao mesmo tempo.
          </p>
        </div>
        <Botao variante="destaque" onClick={rodar} carregando={rodando}>
          {resultado ? <RotateCcw className="size-4" /> : <Play className="size-4" />}
          {resultado ? "Rodar de novo" : "Rodar o teste"}
        </Botao>
      </div>

      <div className="mt-6 grid grid-cols-10 gap-1.5" aria-live="polite">
        {Array.from({ length: PEDIDOS }, (_, i) => {
          const tentativa = ordenadas[i];
          return (
            <motion.div
              key={`${resultado?.horario ?? "parado"}-${i}`}
              initial={resultado ? { opacity: 0, scale: 0.6 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: resultado ? i * 0.035 : 0,
                type: "spring",
                stiffness: 420,
                damping: 26,
              }}
              title={
                tentativa ? `Pedido ${tentativa.pedido}: ${tentativa.duracao_ms} ms` : undefined
              }
              className={`grid aspect-square place-items-center rounded-md font-mono text-[10px] ${
                !tentativa
                  ? rodando
                    ? "animate-pulse bg-fg/[0.08]"
                    : "bg-fg/[0.05] text-faint"
                  : tentativa.aceito
                    ? "bg-ok text-white dark:text-canvas"
                    : "bg-fg/[0.07] text-faint line-through"
              }`}
            >
              {tentativa ? tentativa.pedido : ""}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 min-h-12 text-sm">
        {resultado ? (
          <p className="text-muted">
            <span className="font-semibold text-ok">{resultado.aceitos} aceito</span> e{" "}
            <span className="font-semibold text-fg">{resultado.recusados} recusados</span> em{" "}
            <span className="font-mono">{Math.round(resultado.duracao_ms)} ms</span>, disputando{" "}
            {dataLonga(resultado.horario, "America/Sao_Paulo")} às{" "}
            {hora(resultado.horario, "America/Sao_Paulo")}. O pedido {vencedor?.pedido} chegou
            primeiro ao banco e ficou com o horário. Como os {resultado.pedidos} saem juntos, o
            vencedor muda a cada rodada; o que nunca muda é haver só um.
          </p>
        ) : erro ? (
          <p className="text-muted">
            {erro}{" "}
            <a
              href={`${URL_GITHUB}/blob/main/backend/tests/test_blindagem.py`}
              className="font-medium text-fg underline-offset-4 hover:underline"
            >
              Veja o teste automatizado no código.
            </a>
          </p>
        ) : (
          <p className="text-muted">
            Os pedidos são numerados de 1 a 20 e disparados ao mesmo tempo pela mesma rota que um
            cliente usa. Só um pode ficar com o horário.
          </p>
        )}
      </div>
    </div>
  );
}
