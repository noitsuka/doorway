"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb, Radar } from "lucide-react";

import { NumeroAnimado } from "@/components/numero-animado";
import { Esqueleto } from "@/components/ui";
import { api, textoDoErro } from "@/lib/api";
import type { Demanda } from "@/lib/tipos";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const PERIODOS = [7, 30, 90] as const;

type Celula = Demanda["celulas"][number];

function textoDaSugestao(sugestao: NonNullable<Demanda["sugestao"]>) {
  const dia = DIAS[sugestao.dia_semana].toLowerCase();
  const quando =
    sugestao.de === null ? `aos ${dia}s` : `${dia} das ${sugestao.de}h às ${sugestao.ate}h`;
  return { quando, pedidos: sugestao.pedidos };
}

export function PaginaDaDemanda() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [demanda, setDemanda] = useState<{ dias: number; dados: Demanda }>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    let ativo = true;
    api<Demanda>(`/demanda?dias=${dias}`)
      .then((dados) => ativo && setDemanda({ dias, dados }))
      .catch((e) => ativo && setErro(textoDoErro(e)));
    return () => {
      ativo = false;
    };
  }, [dias]);

  const dados = demanda?.dias === dias ? demanda.dados : undefined;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Demanda perdida
          </h1>
          <p className="mt-2 max-w-lg text-muted">
            Quando os clientes procuraram horário na sua página e não encontraram.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Período"
          className="relative grid grid-cols-3 rounded-control border border-line bg-raised p-1 text-sm"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-[calc(var(--radius-control)-4px)] bg-fg transition-transform duration-300 ease-(--ease-out)"
            style={{ transform: `translateX(${PERIODOS.indexOf(dias) * 100}%)` }}
          />
          {PERIODOS.map((p) => (
            <button
              key={p}
              role="radio"
              aria-checked={dias === p}
              onClick={() => setDias(p)}
              className={`relative z-10 h-8 px-3 font-medium transition-colors duration-300 ${dias === p ? "text-canvas" : "text-muted hover:text-fg"}`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="mt-6 text-sm text-danger">{erro}</p>}

      <div className="mt-8 grid grid-cols-3 overflow-hidden rounded-panel border border-line bg-raised">
        {[
          { rotulo: "Pedidos sem horário", valor: dados?.total },
          { rotulo: "Fora do expediente", valor: dados?.fechado, cor: "bg-accent" },
          { rotulo: "Agenda cheia", valor: dados?.lotado, cor: "bg-danger" },
        ].map(({ rotulo, valor, cor }, i) => (
          <div key={rotulo} className={`p-4 sm:p-6 ${i ? "border-l border-line" : ""}`}>
            <p className="flex items-center gap-2 text-xs text-muted sm:text-sm">
              {cor && <span className={`size-2 shrink-0 rounded-full ${cor}`} />}
              {rotulo}
            </p>
            {valor === undefined ? (
              <Esqueleto className="mt-2 h-8 w-14" />
            ) : (
              <p className="mt-1.5 font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
                <NumeroAnimado valor={valor} desdeZero />
              </p>
            )}
          </div>
        ))}
      </div>

      {dados?.sugestao && <Sugestao sugestao={dados.sugestao} />}

      <section className="mt-6 rounded-panel border border-line bg-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Radar className="size-4 text-muted" /> Quando procuraram
          </h2>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-accent" /> fora do expediente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-danger" /> agenda cheia
            </span>
          </div>
        </div>
        {!dados ? (
          <Esqueleto className="mt-5 h-64" />
        ) : dados.total === 0 ? (
          <p className="mt-5 max-w-md text-sm text-muted">
            Nenhum pedido sem resposta neste período. Cada dia sem horário livre e cada busca por
            frase sem resultado na sua página aparecem aqui.
          </p>
        ) : (
          <MapaDeCalor key={dias} celulas={dados.celulas} />
        )}
      </section>
    </>
  );
}

function Sugestao({ sugestao }: { sugestao: NonNullable<Demanda["sugestao"]> }) {
  const { quando, pedidos } = textoDaSugestao(sugestao);
  return (
    <div className="mt-6 flex animate-surgir flex-col gap-4 rounded-panel bg-inverse p-5 text-on-inverse sm:flex-row sm:items-center sm:p-6">
      <Lightbulb className="size-6 shrink-0 text-on-inverse opacity-70" />
      <p className="flex-1 text-[15px] leading-relaxed">
        Abrir <span className="font-semibold">{quando}</span> teria atendido{" "}
        <span className="font-semibold">
          {pedidos} {pedidos === 1 ? "pedido" : "pedidos"}
        </span>{" "}
        que não encontraram horário.
      </p>
      <Link
        href="/painel/horarios"
        className="group inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-control bg-on-inverse px-4 text-sm font-semibold text-inverse"
      >
        Ajustar horários
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function quandoDaCelula(celula: Celula) {
  const dia = DIAS[celula.dia_semana];
  return celula.hora === null ? `${dia}, dia inteiro` : `${dia}, ${celula.hora}h`;
}

function totalDa(celula: Celula) {
  return celula.fechado + celula.lotado;
}

function MapaDeCalor({ celulas }: { celulas: Celula[] }) {
  const ranking = [...celulas].sort((a, b) => totalDa(b) - totalDa(a));
  const [selecionada, setSelecionada] = useState<Celula>(ranking[0]);
  const comHora = celulas.filter((c) => c.hora !== null);
  const primeira = Math.min(8, ...comHora.map((c) => c.hora!));
  const ultima = Math.max(20, ...comHora.map((c) => c.hora!));
  const horas = Array.from({ length: ultima - primeira + 1 }, (_, i) => primeira + i);
  const indice = new Map(celulas.map((c) => [`${c.dia_semana}:${c.hora}`, c]));
  const maximo = Math.max(1, ...celulas.map(totalDa));
  const colunas = [null, ...horas];

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="min-w-0">
        <div className="-mx-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          <div
            role="grid"
            aria-label="Pedidos sem horário por dia e hora"
            className="grid w-max gap-1"
            style={{
              gridTemplateColumns: `3rem repeat(${colunas.length}, clamp(1.5rem, 3.6vw, 2.1rem))`,
            }}
          >
            <span />
            {colunas.map((h) => (
              <span key={h ?? "dia"} className="pb-1 text-center font-mono text-[10px] text-faint">
                {h === null ? "dia" : h}
              </span>
            ))}
            {DIAS.map((nome, dia) => (
              <div key={nome} role="row" className="contents">
                <span className="self-center pr-2 text-xs font-medium text-muted">
                  {nome.slice(0, 3)}
                </span>
                {colunas.map((hora, coluna) => {
                  const celula = indice.get(`${dia}:${hora}`);
                  const total = celula ? totalDa(celula) : 0;
                  const ativa = celula !== undefined && celula === selecionada;
                  const cor =
                    celula && celula.lotado > celula.fechado ? "var(--danger)" : "var(--accent)";
                  const forca = total ? 22 + Math.round((total / maximo) * 78) : 0;
                  return (
                    <button
                      key={hora ?? "dia"}
                      type="button"
                      role="gridcell"
                      disabled={!celula}
                      aria-selected={ativa}
                      aria-label={
                        celula
                          ? `${quandoDaCelula(celula)}: ${total} ${total === 1 ? "pedido" : "pedidos"}`
                          : `${nome}, ${hora === null ? "dia inteiro" : `${hora}h`}: nenhum pedido`
                      }
                      onClick={() => celula && setSelecionada(celula)}
                      className={`aspect-square rounded-[5px] transition-[transform,box-shadow] duration-200 ${
                        total ? "animate-celula cursor-pointer hover:scale-110" : "bg-fg/[0.04]"
                      } ${ativa ? "ring-2 ring-fg ring-offset-2 ring-offset-raised" : ""} ${
                        hora === null ? "mr-1.5" : ""
                      }`}
                      style={
                        total
                          ? {
                              background: `color-mix(in oklab, ${cor} ${forca}%, transparent)`,
                              animationDelay: `${(dia + coluna) * 18}ms`,
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <Detalhe celula={selecionada} />
      </div>

      <div>
        <p className="text-sm font-medium">Mais procurados</p>
        <ol className="mt-3 space-y-1">
          {ranking.slice(0, 6).map((celula, posicao) => (
            <li key={`${celula.dia_semana}:${celula.hora}`}>
              <button
                type="button"
                onClick={() => setSelecionada(celula)}
                className={`flex w-full items-center gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors ${
                  celula === selecionada ? "bg-fg/[0.07]" : "hover:bg-fg/[0.04]"
                }`}
              >
                <span className="w-4 font-mono text-xs text-faint">{posicao + 1}</span>
                <span
                  className={`size-2 shrink-0 rounded-full ${celula.lotado > celula.fechado ? "bg-danger" : "bg-accent"}`}
                />
                <span className="min-w-0 flex-1 truncate">{quandoDaCelula(celula)}</span>
                <span className="font-mono font-medium tabular">{totalDa(celula)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Detalhe({ celula }: { celula: Celula }) {
  const total = totalDa(celula);
  const fechado = celula.fechado >= celula.lotado;
  return (
    <div
      key={`${celula.dia_semana}:${celula.hora}`}
      aria-live="polite"
      className="mt-5 animate-surgir rounded-control border border-line bg-canvas p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{quandoDaCelula(celula)}</p>
        <p className="font-mono text-sm text-muted tabular">
          {total} {total === 1 ? "pedido" : "pedidos"}
        </p>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
        <span className="bg-accent" style={{ width: `${(celula.fechado / total) * 100}%` }} />
        <span className="bg-danger" style={{ width: `${(celula.lotado / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span>{celula.fechado} fora do expediente</span>
        <span>{celula.lotado} com agenda cheia</span>
      </div>
      <p className="mt-3 text-sm text-muted">
        {fechado
          ? "Você não atende nesse horário. Abrir aqui receberia esses clientes."
          : "O horário existia, mas já estava ocupado. Vale ampliar o atendimento perto daqui."}
      </p>
      {fechado && (
        <Link
          href="/painel/horarios"
          className="group mt-3 inline-flex items-center gap-1 text-sm font-medium text-link"
        >
          Ajustar horários
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
