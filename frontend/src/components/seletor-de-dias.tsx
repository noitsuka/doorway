"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { dataLonga, diaDoMes, diaSemanaCurto, mesCurto, somarDias } from "@/lib/formatacao";

const ARRASTE_MINIMO = 6;
const INICIAIS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"];
const NOME_DO_MES = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export type RotuloDoDia = { texto: string; tom?: "destaque" | "apagado" };

function useArrastarParaRolar() {
  const faixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = faixa.current;
    if (!elemento) return;
    let inicioX = 0;
    let inicioRolagem = 0;
    let arrastando = false;
    let moveu = false;

    const aoPressionar = (evento: PointerEvent) => {
      if (evento.pointerType !== "mouse" || evento.button !== 0) return;
      arrastando = true;
      moveu = false;
      inicioX = evento.clientX;
      inicioRolagem = elemento.scrollLeft;
    };
    const aoMover = (evento: PointerEvent) => {
      if (!arrastando) return;
      const deslocamento = evento.clientX - inicioX;
      if (!moveu && Math.abs(deslocamento) < ARRASTE_MINIMO) return;
      if (!moveu) {
        moveu = true;
        elemento.setPointerCapture(evento.pointerId);
        elemento.dataset.arrastando = "";
      }
      elemento.scrollLeft = inicioRolagem - deslocamento;
    };
    const aoSoltar = () => {
      arrastando = false;
      delete elemento.dataset.arrastando;
    };
    const aoClicar = (evento: MouseEvent) => {
      if (moveu) {
        evento.preventDefault();
        evento.stopPropagation();
        moveu = false;
      }
    };

    elemento.addEventListener("pointerdown", aoPressionar);
    elemento.addEventListener("pointermove", aoMover);
    elemento.addEventListener("pointerup", aoSoltar);
    elemento.addEventListener("pointercancel", aoSoltar);
    elemento.addEventListener("click", aoClicar, true);
    return () => {
      elemento.removeEventListener("pointerdown", aoPressionar);
      elemento.removeEventListener("pointermove", aoMover);
      elemento.removeEventListener("pointerup", aoSoltar);
      elemento.removeEventListener("pointercancel", aoSoltar);
      elemento.removeEventListener("click", aoClicar, true);
    };
  }, []);

  return faixa;
}

function inicioDoMes(dia: string) {
  return `${dia.slice(0, 7)}-01`;
}

function somarMeses(mes: string, quantidade: number) {
  const data = new Date(`${mes}T12:00:00Z`);
  data.setUTCMonth(data.getUTCMonth() + quantidade);
  return data.toISOString().slice(0, 10);
}

function CalendarioMensal({
  primeiro,
  ultimo,
  valor,
  habilitado,
  marcado,
  legenda,
  aoEscolher,
  aoFechar,
}: {
  primeiro: string;
  ultimo: string;
  valor: string;
  habilitado: (dia: string) => boolean;
  marcado: (dia: string) => boolean;
  legenda: string;
  aoEscolher: (dia: string) => void;
  aoFechar: () => void;
}) {
  const [mes, setMes] = useState(() => inicioDoMes(valor));
  const caixa = useRef<HTMLDivElement>(null);
  const primeiroMes = inicioDoMes(primeiro);
  const ultimoMes = inicioDoMes(ultimo);

  useEffect(() => {
    const aoClicarFora = (evento: PointerEvent) => {
      if (!caixa.current?.parentElement?.contains(evento.target as Node)) aoFechar();
    };
    const aoTeclar = (evento: KeyboardEvent) => evento.key === "Escape" && aoFechar();
    document.addEventListener("pointerdown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aoFechar]);

  const deslocamento = (new Date(`${mes}T12:00:00Z`).getUTCDay() + 6) % 7;
  const diasNoMes = new Date(
    Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0),
  ).getUTCDate();
  const dias = Array.from({ length: diasNoMes }, (_, i) => somarDias(mes, i));

  return (
    <div
      ref={caixa}
      role="dialog"
      aria-label="Escolher data no calendário"
      className="absolute top-full right-0 z-30 mt-2 w-[19rem] max-w-[calc(100vw-2.5rem)] animate-surgir rounded-panel border border-line bg-raised p-4 shadow-3"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={mes <= primeiroMes}
          onClick={() => setMes(somarMeses(mes, -1))}
          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold first-letter:uppercase">
          {NOME_DO_MES.format(new Date(`${mes}T12:00:00Z`))}
        </p>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={mes >= ultimoMes}
          onClick={() => setMes(somarMeses(mes, 1))}
          className="grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {INICIAIS_SEMANA.map((inicial, i) => (
          <span key={i} className="pb-1 text-[11px] font-medium text-faint">
            {inicial}
          </span>
        ))}
        {Array.from({ length: deslocamento }, (_, i) => (
          <span key={`vazio-${i}`} />
        ))}
        {dias.map((dia) => {
          const disponivel = dia >= primeiro && dia <= ultimo && habilitado(dia);
          const selecionado = dia === valor;
          return (
            <button
              key={dia}
              type="button"
              disabled={!disponivel}
              aria-pressed={selecionado}
              aria-label={dataLonga(`${dia}T12:00:00Z`, "UTC")}
              onClick={() => aoEscolher(dia)}
              className={`relative grid aspect-square place-items-center rounded-control font-mono text-sm tabular transition-colors ${
                selecionado
                  ? "bg-fg font-semibold text-canvas"
                  : disponivel
                    ? "font-medium hover:bg-fg/[0.07]"
                    : "text-faint/50"
              }`}
            >
              {Number(dia.slice(8))}
              {disponivel && !selecionado && marcado(dia) && (
                <span className="absolute bottom-1 size-1 rounded-full bg-accent" />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-faint">
        <span className="size-1 rounded-full bg-accent" /> {legenda}
      </p>
    </div>
  );
}

export function SeletorDeDias({
  dias,
  hoje,
  valor,
  aoMudar,
  rotulo,
  indisponivel = () => false,
  marcado,
  legenda,
  acoes,
  className = "mt-5",
}: {
  dias: string[];
  hoje: string;
  valor: string;
  aoMudar: (dia: string) => void;
  rotulo: (dia: string) => RotuloDoDia | undefined;
  indisponivel?: (dia: string) => boolean;
  marcado: (dia: string) => boolean;
  legenda: string;
  acoes?: ReactNode;
  className?: string;
}) {
  const faixa = useArrastarParaRolar();
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  useEffect(() => {
    faixa.current
      ?.querySelector<HTMLElement>(`[data-dia="${valor}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [valor, faixa]);

  function aoTeclar(evento: React.KeyboardEvent) {
    const disponiveis = dias.filter((d) => !indisponivel(d));
    const indice = disponiveis.indexOf(valor);
    if (evento.key === "ArrowRight" && indice < disponiveis.length - 1) {
      aoMudar(disponiveis[indice + 1]);
    }
    if (evento.key === "ArrowLeft" && indice > 0) aoMudar(disponiveis[indice - 1]);
  }

  return (
    <div className={className}>
      <div className="relative mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted first-letter:uppercase">
          {dataLonga(`${valor}T12:00:00Z`, "UTC")}
        </p>
        <div className="flex items-center gap-2">
          {acoes}
          <button
            type="button"
            onClick={() => setCalendarioAberto((aberto) => !aberto)}
            aria-expanded={calendarioAberto}
            aria-label="Abrir calendário"
            className={`inline-flex h-9 items-center gap-1.5 rounded-control border px-2.5 text-sm font-medium transition-colors ${
              calendarioAberto
                ? "border-fg/30 bg-fg/[0.06] text-fg"
                : "border-line text-muted hover:border-fg/30 hover:text-fg"
            }`}
          >
            <CalendarDays className="size-4" />
            <span className="hidden sm:inline">Calendário</span>
          </button>
        </div>
        {calendarioAberto && (
          <CalendarioMensal
            primeiro={dias[0]}
            ultimo={dias[dias.length - 1]}
            valor={valor}
            habilitado={(dia) => !indisponivel(dia)}
            marcado={marcado}
            legenda={legenda}
            aoEscolher={(dia) => {
              aoMudar(dia);
              setCalendarioAberto(false);
            }}
            aoFechar={() => setCalendarioAberto(false)}
          />
        )}
      </div>
      <div
        ref={faixa}
        role="radiogroup"
        aria-label="Data"
        onKeyDown={aoTeclar}
        className="-mx-5 no-scrollbar flex cursor-grab snap-x snap-proximity scroll-px-5 gap-2 overflow-x-auto overscroll-x-contain px-5 pb-1 select-none data-arrastando:cursor-grabbing data-arrastando:snap-none sm:mx-0 sm:scroll-px-0 sm:[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)] sm:px-0"
      >
        {dias.map((d) => {
          const selecionado = d === valor;
          const bloqueado = indisponivel(d);
          const legendaDoDia = rotulo(d);
          return (
            <button
              key={d}
              data-dia={d}
              role="radio"
              aria-checked={selecionado}
              aria-disabled={bloqueado || undefined}
              tabIndex={selecionado ? 0 : -1}
              onClick={() => !bloqueado && aoMudar(d)}
              className={`w-[4.5rem] shrink-0 snap-start rounded-control border px-1 py-2.5 text-center transition-[background-color,border-color,color,transform] duration-200 ${
                selecionado
                  ? "border-fg bg-fg text-canvas"
                  : bloqueado
                    ? "cursor-default border-transparent bg-fg/[0.03] text-faint"
                    : "border-line bg-raised hover:-translate-y-0.5 hover:border-fg/30"
              }`}
            >
              <span className="block text-[11px] font-medium tracking-wide uppercase opacity-70">
                {d === hoje ? "hoje" : diaSemanaCurto(d)}
              </span>
              <span className="mt-0.5 block font-mono text-2xl leading-tight font-semibold tabular">
                {diaDoMes(d)}
              </span>
              <span className="block text-[11px] opacity-60">{mesCurto(d)}</span>
              <span
                className={`mt-1.5 block h-3.5 text-[10px] leading-none font-medium ${
                  selecionado
                    ? "opacity-80"
                    : legendaDoDia?.tom === "destaque"
                      ? "text-accent"
                      : legendaDoDia?.tom === "apagado"
                        ? "text-faint"
                        : ""
                }`}
              >
                {legendaDoDia?.texto ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
