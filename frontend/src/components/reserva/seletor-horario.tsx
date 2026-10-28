"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownRight } from "lucide-react";

import { SeletorDeDias } from "@/components/seletor-de-dias";
import { Esqueleto } from "@/components/ui";
import { api } from "@/lib/api";
import { hojeEm, hora, minutosDoDia, somarDias } from "@/lib/formatacao";
import type { DiasLivres, HorariosLivres } from "@/lib/tipos";

const DIAS_ADIANTE = 61;
const ATUALIZAR_MS = 20_000;

export function consultaDeServicos(servicoIds: number[]) {
  const consulta = new URLSearchParams();
  servicoIds.forEach((id) => consulta.append("servico_id", String(id)));
  return consulta;
}

export function FaixaDeDias({
  slug,
  servicoIds,
  fuso,
  valor,
  aoMudar,
}: {
  slug: string;
  servicoIds: number[];
  fuso: string;
  valor: string;
  aoMudar: (dia: string) => void;
}) {
  const hoje = useMemo(() => hojeEm(fuso), [fuso]);
  const dias = useMemo(
    () => Array.from({ length: DIAS_ADIANTE }, (_, i) => somarDias(hoje, i)),
    [hoje],
  );
  const chave = `${servicoIds.join(",")}:${hoje}`;
  const [livres, setLivres] = useState<{ chave: string; porDia: Record<string, number> }>();
  const ajustado = useRef<string>(undefined);
  const porDia = livres?.chave === chave ? livres.porDia : undefined;

  useEffect(() => {
    let ativo = true;
    const [ids, inicio] = chave.split(":");
    const consulta = consultaDeServicos(ids.split(",").map(Number));
    consulta.set("de", inicio);
    consulta.set("quantidade", String(DIAS_ADIANTE));
    api<DiasLivres>(`/publico/${slug}/dias?${consulta}`)
      .then(
        (dados) =>
          ativo &&
          setLivres({
            chave,
            porDia: Object.fromEntries(dados.dias.map((d) => [d.data, d.livres])),
          }),
      )
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [slug, chave]);

  useEffect(() => {
    if (!porDia || ajustado.current === chave) return;
    ajustado.current = chave;
    if (porDia[valor]) return;
    const primeiro = dias.find((d) => porDia[d] > 0);
    if (primeiro) aoMudar(primeiro);
  }, [porDia, chave, valor, dias, aoMudar]);

  return (
    <SeletorDeDias
      dias={dias}
      hoje={hoje}
      valor={valor}
      aoMudar={aoMudar}
      indisponivel={(d) => porDia?.[d] === 0}
      marcado={(d) => (porDia?.[d] ?? 0) > 0}
      legenda="dias com horário disponível"
      rotulo={(d) => {
        const quantidade = porDia?.[d];
        if (quantidade === undefined) return undefined;
        if (quantidade === 0) return { texto: "indisponível" };
        return {
          texto: `${quantidade} ${quantidade === 1 ? "horário" : "horários"}`,
          tom: "destaque",
        };
      }}
    />
  );
}

export function GradeDeHorarios({
  slug,
  servicoIds,
  dia,
  fuso,
  valor,
  aoMudar,
  aoSumir,
  sugerirApos,
}: {
  slug: string;
  servicoIds: number[];
  dia: string;
  fuso: string;
  valor?: string;
  aoMudar: (horario: string) => void;
  aoSumir?: () => void;
  sugerirApos?: string;
}) {
  const chave = `${servicoIds.join(",")}:${dia}`;
  const [resultado, setResultado] = useState<{
    chave: string;
    horarios: string[];
    falhou?: boolean;
  }>();

  useEffect(() => {
    let ativo = true;
    const [ids, diaDaChave] = chave.split(":");
    const consulta = consultaDeServicos(ids.split(",").map(Number));
    consulta.set("dia", diaDaChave);
    const carregar = () =>
      api<HorariosLivres>(`/publico/${slug}/horarios-livres?${consulta}`)
        .then((dados) => ativo && setResultado({ chave, horarios: dados.horarios }))
        .catch(
          () =>
            ativo &&
            setResultado((r) => (r?.chave === chave ? r : { chave, horarios: [], falhou: true })),
        );

    carregar();
    const aoVoltar = () => document.visibilityState === "visible" && carregar();
    const temporizador = setInterval(aoVoltar, ATUALIZAR_MS);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      clearInterval(temporizador);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [slug, chave]);

  const atual = resultado?.chave === chave ? resultado : undefined;
  const sumiu = Boolean(valor && atual && !atual.falhou && !atual.horarios.includes(valor));

  useEffect(() => {
    if (sumiu) aoSumir?.();
  }, [sumiu, aoSumir]);

  if (!atual) {
    return (
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Esqueleto key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (atual.horarios.length === 0) {
    return (
      <div className="mt-6 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
        <p className="font-medium">
          {atual.falhou
            ? "Não foi possível carregar os horários."
            : "Nenhum horário disponível nesta data."}
        </p>
        <p className="mt-1 text-sm text-muted">
          {atual.falhou
            ? "Verifique sua conexão. Uma nova tentativa será feita automaticamente."
            : "Selecione outra data acima."}
        </p>
      </div>
    );
  }

  const sugestoes = sugerirApos ? atual.horarios.filter((h) => h >= sugerirApos).slice(0, 3) : [];

  const periodos = [
    { rotulo: "Manhã", de: 0, ate: 12 * 60 },
    { rotulo: "Tarde", de: 12 * 60, ate: 18 * 60 },
    { rotulo: "Noite", de: 18 * 60, ate: 24 * 60 },
  ]
    .map((p) => ({
      ...p,
      horarios: atual.horarios.filter((h) => {
        const minutos = minutosDoDia(h, fuso);
        return minutos >= p.de && minutos < p.ate;
      }),
    }))
    .filter((p) => p.horarios.length);

  const botaoDeHorario = (h: string) => {
    const selecionado = h === valor;
    return (
      <span
        key={h}
        className="grid animate-surgir"
        style={{ animationDelay: `${Math.min(atual.horarios.indexOf(h), 24) * 14}ms` }}
      >
        <button
          role="radio"
          aria-checked={selecionado}
          onClick={() => aoMudar(h)}
          className={`h-12 rounded-control border font-mono text-[15px] font-medium tabular transition-[border-color,background-color,color,transform] active:scale-95 ${
            selecionado
              ? "animate-pop border-accent bg-accent text-accent-fg"
              : "border-line bg-raised hover:border-accent hover:text-accent"
          }`}
        >
          {hora(h, fuso)}
        </button>
      </span>
    );
  };

  return (
    <div className="mt-6 space-y-6" role="radiogroup" aria-label="Horário">
      {sugestoes.length > 0 && (
        <div className="rounded-panel border border-accent/30 bg-accent-soft/60 p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium">
            <CornerDownRight className="size-4 text-muted" /> Próximos horários disponíveis
          </p>
          <div className="grid grid-cols-3 gap-2">{sugestoes.map(botaoDeHorario)}</div>
        </div>
      )}
      {periodos.map((periodo) => (
        <div key={periodo.rotulo}>
          <p className="mb-2.5 flex items-center gap-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">
            {periodo.rotulo}
            <span className="h-px flex-1 bg-line" />
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
            {periodo.horarios.map(botaoDeHorario)}
          </div>
        </div>
      ))}
    </div>
  );
}
