"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";

import { consultaDeServicos } from "@/components/reserva/seletor-horario";
import { api, textoDoErro } from "@/lib/api";
import { diaDoMes, diaLocal, diaSemanaCurto, hora } from "@/lib/formatacao";
import type { Busca } from "@/lib/tipos";

export function BuscaPorFrase({
  slug,
  servicoIds,
  fuso,
  valor,
  aoEscolher,
}: {
  slug: string;
  servicoIds: number[];
  fuso: string;
  valor?: string;
  aoEscolher: (horario: string) => void;
}) {
  const [frase, setFrase] = useState("");
  const [busca, setBusca] = useState<Busca>();
  const [erro, setErro] = useState<string>();
  const [carregando, setCarregando] = useState(false);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const ids = servicoIds.join(",");

  useEffect(() => {
    let ativo = true;
    const consulta = consultaDeServicos(ids.split(",").map(Number));
    api<{ sugestoes: string[] }>(`/publico/${slug}/sugestoes?${consulta}`)
      .then((dados) => ativo && setSugestoes(dados.sugestoes))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, ids]);

  async function buscar(texto: string) {
    const pedido = texto.trim();
    if (!pedido) return;
    setFrase(pedido);
    setCarregando(true);
    setErro(undefined);
    try {
      const parametros = consultaDeServicos(servicoIds);
      parametros.set("frase", pedido);
      setBusca(await api<Busca>(`/publico/${slug}/busca?${parametros}`));
    } catch (e) {
      setErro(textoDoErro(e));
      setBusca(undefined);
    } finally {
      setCarregando(false);
    }
  }

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    buscar(frase);
  }

  const entendido = busca?.entendido
    ? [busca.rotulo_dia, busca.rotulo_horario].filter(Boolean).join(", ")
    : undefined;

  return (
    <div className="mt-4">
      <form onSubmit={aoEnviar}>
        <label htmlFor="desejo" className="sr-only">
          Buscar horário por data ou período
        </label>
        <div className="relative flex gap-2">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <input
            id="desejo"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            maxLength={80}
            placeholder={`Ex.: ${sugestoes[0] ?? "amanhã à tarde"}`}
            autoComplete="off"
            enterKeyHint="search"
            className="h-11 min-w-0 flex-1 rounded-control border border-line bg-raised pr-3.5 pl-10 text-[15px] transition-[border-color,box-shadow] outline-none placeholder:text-faint focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <button
            type="submit"
            aria-label="Procurar horários"
            disabled={carregando || !frase.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-control bg-accent text-accent-fg transition-[filter] hover:brightness-110 disabled:opacity-45"
          >
            <ArrowRight className={`size-4 ${carregando ? "animate-pulse" : ""}`} />
          </button>
        </div>
      </form>

      {!busca && !erro && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sugestoes.map((exemplo) => (
            <button
              key={exemplo}
              type="button"
              onClick={() => buscar(exemplo)}
              className="rounded-full border border-line px-3 py-1 text-[13px] text-muted transition-colors hover:border-accent hover:text-fg"
            >
              {exemplo}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {(busca || erro) && (
          <motion.div
            key={`${frase}-${busca?.horarios.length ?? "e"}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4"
            aria-live="polite"
          >
            {erro ? (
              <p className="text-sm text-danger">{erro}</p>
            ) : !busca?.entendido ? (
              <p className="text-sm text-muted">
                Não foi possível interpretar a busca. Tente, por exemplo, &quot;quinta de
                manhã&quot; ou &quot;dia 25 depois das 14h&quot;.
              </p>
            ) : busca.horarios.length === 0 ? (
              <p className="text-sm text-muted">Nenhum horário disponível {entendido}.</p>
            ) : (
              <>
                <p className="text-sm text-muted">
                  Horários disponíveis <span className="font-medium text-fg">{entendido}</span>:
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {busca.horarios.map((horario) => {
                    const dia = diaLocal(horario, fuso);
                    const ativo = horario === valor;
                    return (
                      <button
                        key={horario}
                        type="button"
                        onClick={() => aoEscolher(horario)}
                        aria-pressed={ativo}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-control border text-sm transition-colors ${
                          ativo
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-line hover:border-accent"
                        }`}
                      >
                        <span className={ativo ? "" : "text-muted"}>
                          {diaSemanaCurto(dia)} {diaDoMes(dia)}
                        </span>
                        <span className="font-mono font-semibold tabular">
                          {hora(horario, fuso)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
