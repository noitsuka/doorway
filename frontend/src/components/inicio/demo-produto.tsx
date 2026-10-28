"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Lightbulb,
  MessageSquareText,
  Palette,
  Radar,
  Scissors,
  Search,
  Users,
} from "lucide-react";

import { LogoMarca } from "@/components/logo";
import { EXEMPLOS } from "@/lib/exemplos";
import { saudacao } from "@/lib/formatacao";
import { estiloDaMarca } from "@/lib/marca";

const GIRAR_MS = 7000;
const suavidade = [0.23, 1, 0.32, 1] as const;

const abas = [
  { id: "agenda", rotulo: "Agenda do dia", icone: CalendarDays },
  { id: "reserva", rotulo: "Página do cliente", icone: Scissors },
  { id: "frase", rotulo: "Busca por frase", icone: MessageSquareText },
  { id: "demanda", rotulo: "Demanda perdida", icone: Radar },
  { id: "corrida", rotulo: "Reserva simultânea", icone: Users },
] as const;

type Aba = (typeof abas)[number]["id"];

export function DemoProduto() {
  const [ativa, setAtiva] = useState<Aba>("agenda");
  const [automatico, setAutomatico] = useState(true);
  const [pausado, setPausado] = useState(false);
  const movimentoReduzido = useReducedMotion();
  const girando = automatico && !pausado && !movimentoReduzido;

  useEffect(() => {
    if (!girando) return;
    const temporizador = setTimeout(() => {
      const indice = abas.findIndex((a) => a.id === ativa);
      setAtiva(abas[(indice + 1) % abas.length].id);
    }, GIRAR_MS);
    return () => clearTimeout(temporizador);
  }, [ativa, girando]);

  return (
    <div
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
      className="overflow-hidden rounded-panel border border-line bg-raised shadow-3"
    >
      <div className="relative h-[27rem] overflow-hidden sm:h-[30rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={ativa}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: suavidade }}
            className="absolute inset-0"
            aria-hidden
          >
            {ativa === "agenda" && <TelaAgenda />}
            {ativa === "reserva" && <TelaReserva />}
            {ativa === "frase" && <TelaFrase />}
            {ativa === "demanda" && <TelaDemanda />}
            {ativa === "corrida" && <TelaCorrida />}
          </motion.div>
        </AnimatePresence>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-raised to-transparent" />
      </div>

      <div
        role="tablist"
        aria-label="Telas do produto"
        className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line bg-canvas p-1.5"
      >
        {abas.map(({ id, rotulo, icone: Icone }) => {
          const selecionada = id === ativa;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={selecionada}
              onClick={() => {
                setAtiva(id);
                setAutomatico(false);
              }}
              className={`relative flex h-9 shrink-0 items-center gap-2 rounded-[4px] px-3 text-[13px] font-medium transition-colors duration-200 ${selecionada ? "text-fg" : "text-muted hover:text-fg"}`}
            >
              {selecionada && (
                <motion.span
                  layoutId="aba-demo"
                  transition={{ duration: 0.35, ease: suavidade }}
                  className="absolute inset-0 overflow-hidden rounded-[4px] border border-line bg-raised"
                >
                  {automatico && !pausado && (
                    <motion.span
                      key={ativa}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: GIRAR_MS / 1000, ease: "linear" }}
                      className="absolute inset-x-0 bottom-0 h-px origin-left bg-fg/40 motion-reduce:hidden"
                    />
                  )}
                </motion.span>
              )}
              <Icone className="relative size-3.5" />
              <span className="relative">{rotulo}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Indicadores({
  itens,
  className,
  truncar = false,
}: {
  itens: [rotulo: string, valor: string][];
  className: string;
  truncar?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 overflow-hidden rounded-[8px] border border-line text-xs ${className}`}
    >
      {itens.map(([rotulo, valor], i) => (
        <div key={rotulo} className={`p-3 ${i < itens.length - 1 ? "border-r border-line" : ""}`}>
          <p className={truncar ? "truncate text-muted" : "text-muted"}>{rotulo}</p>
          <p className="mt-1 font-mono text-base font-medium">{valor}</p>
        </div>
      ))}
    </div>
  );
}

const dia = [
  { inicio: 9, duracao: 1, nome: "Rafael Souza", servico: "Corte + barba" },
  { inicio: 10.25, duracao: 0.5, nome: "Bruno Lima", servico: "Corte masculino" },
  { inicio: 11, duracao: 0.75, nome: "Caio Martins", servico: "Pigmentação" },
  { inicio: 13.5, duracao: 0.5, nome: "Lucas Rocha", servico: "Barba completa" },
  { inicio: 15, duracao: 1, nome: "Diego Costa", servico: "Corte + barba" },
];
const PRIMEIRA_HORA = 8;
const HORAS = 9;
const LINHA = 2.6;

const nenhumAviso = () => () => {};

function TelaAgenda() {
  const ola = useSyncExternalStore(
    nenhumAviso,
    () => saudacao(Intl.DateTimeFormat().resolvedOptions().timeZone),
    () => null,
  );
  return (
    <div className="grid h-full md:grid-cols-[11rem_1fr]">
      <aside className="hidden border-r border-line p-4 md:block">
        <div className="flex items-center gap-2">
          <LogoMarca className="size-5" />
          <span className="text-sm font-semibold">doorway</span>
        </div>
        <ul className="mt-6 space-y-0.5 text-[13px]">
          {[
            [CalendarDays, "Agenda", true],
            [Scissors, "Serviços", false],
            [Clock3, "Horários", false],
            [Radar, "Demanda", false],
            [Palette, "Página", false],
          ].map(([Icone, rotulo, atual]) => {
            const I = Icone as typeof CalendarDays;
            return (
              <li
                key={rotulo as string}
                className={`flex items-center gap-2 rounded-[6px] px-2 py-1.5 ${atual ? "bg-fg/[0.08] text-fg" : "text-muted"}`}
              >
                <I className="size-3.5" /> {rotulo as string}
              </li>
            );
          })}
        </ul>
      </aside>
      <div className="p-4 sm:p-6">
        <p className="text-xl font-medium tracking-tight">
          <span className={ola ? undefined : "invisible"}>{ola ?? "Bom dia"}</span>, Thiago.
        </p>
        <Indicadores
          className="mt-4"
          itens={[
            ["Hoje", "5"],
            ["Na semana", "31"],
            ["Receita prevista", "R$ 2.315"],
          ]}
        />
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted">Sexta-feira, 24 de outubro</span>
          <span className="inline-flex items-center gap-1 rounded-[6px] border border-line px-2 py-1 text-muted">
            <CalendarDays className="size-3" /> Calendário
          </span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {[
            ["ter", "21", 6],
            ["qua", "22", 7],
            ["qui", "23", 4],
            ["hoje", "24", 5],
            ["sáb", "25", 8],
            ["dom", "26", 0],
            ["seg", "27", 3],
          ].map(([semana, numero, clientes]) => {
            const selecionado = numero === "24";
            return (
              <div
                key={numero}
                className={`rounded-[8px] border py-1.5 text-center ${
                  selecionado ? "border-fg bg-fg text-canvas" : "border-line"
                }`}
              >
                <span className="block text-[9px] uppercase opacity-70">{semana}</span>
                <span className="block font-mono text-base leading-tight font-semibold">
                  {numero}
                </span>
                <span
                  className={`block text-[9px] ${selecionado ? "opacity-80" : clientes ? "text-accent" : "text-faint"}`}
                >
                  {clientes ? `${clientes} clientes` : "fechado"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-5 ml-11" style={{ height: `${HORAS * LINHA}rem` }}>
          {Array.from({ length: HORAS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${i * LINHA}rem` }}
            >
              <span className="absolute -top-2 -left-11 w-8 text-right font-mono text-[10px] text-faint">
                {String(PRIMEIRA_HORA + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}
          <div
            className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--line)_6px_7px)]"
            style={{ top: `${(12 - PRIMEIRA_HORA) * LINHA}rem`, height: `${LINHA}rem` }}
          />
          {dia.map((item, i) => (
            <motion.div
              key={item.nome}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4, ease: suavidade }}
              className="absolute inset-x-1 flex flex-col justify-center overflow-hidden rounded-[6px] border border-line bg-surface px-3 text-xs"
              style={{
                top: `calc(${(item.inicio - PRIMEIRA_HORA) * LINHA}rem + 2px)`,
                height: `calc(${item.duracao * LINHA}rem - 4px)`,
              }}
            >
              <span className="truncate font-medium">{item.nome}</span>
              {item.duracao >= 0.75 && <span className="truncate text-muted">{item.servico}</span>}
            </motion.div>
          ))}
          <div
            className="absolute inset-x-0 h-px bg-link"
            style={{ top: `${(14.6 - PRIMEIRA_HORA) * LINHA}rem` }}
          >
            <span className="absolute -top-[3px] -left-1 size-[7px] rounded-full bg-link" />
          </div>
        </div>
      </div>
    </div>
  );
}

const barbearia = EXEMPLOS[0];

function TelaReserva() {
  const dias = [
    ["ter", "21", 6],
    ["qua", "22", 9],
    ["qui", "23", 0],
    ["sex", "24", 4],
    ["sáb", "25", 7],
  ] as const;
  const horarios = ["09:00", "09:30", "10:15", "11:00", "14:00", "14:45", "15:30", "16:15"];
  return (
    <div className="mx-auto h-full max-w-md p-5 sm:p-8" style={estiloDaMarca(barbearia.cor)}>
      <p className="text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">
        {barbearia.categoria}
      </p>
      <p className="font-medium">{barbearia.nome}</p>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-muted">Quarta-feira, 22 de outubro</span>
        <span className="inline-flex items-center gap-1 rounded-[6px] border border-line px-2 py-1 text-muted">
          <CalendarDays className="size-3" /> Calendário
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-5 gap-1.5">
        {dias.map(([semana, numero, livres]) => {
          const selecionado = numero === "22";
          return (
            <div
              key={numero}
              className={`rounded-[8px] border py-1.5 text-center ${
                selecionado
                  ? "border-fg bg-fg text-canvas"
                  : livres
                    ? "border-line"
                    : "border-transparent bg-fg/[0.03] text-faint"
              }`}
            >
              <span className="block text-[9px] uppercase opacity-70">{semana}</span>
              <span className="block font-mono text-base leading-tight font-semibold">
                {numero}
              </span>
              <span
                className={`block text-[9px] ${selecionado ? "opacity-80" : livres ? "text-accent" : ""}`}
              >
                {livres ? `${livres} horários` : "indisponível"}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {horarios.map((rotulo, i) => (
          <motion.div
            key={rotulo}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.35, ease: suavidade }}
            className={`grid h-9 place-items-center rounded-[8px] border font-mono text-[13px] ${
              rotulo === "10:15" ? "border-accent bg-accent text-accent-fg" : "border-line"
            }`}
          >
            {rotulo}
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[8px] border border-line px-3.5 py-2.5 text-sm">
        <span className="text-muted">Corte + barba · qua 22 · 10:15</span>
        <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-2.5 py-1 text-[13px] font-medium text-accent-fg">
          Continuar <ArrowRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

function TelaFrase() {
  const texto = "sexta à tarde";
  const [digitados, setDigitados] = useState(0);

  useEffect(() => {
    if (digitados >= texto.length) return;
    const espera = setTimeout(() => setDigitados((n) => n + 1), digitados ? 70 : 350);
    return () => clearTimeout(espera);
  }, [digitados]);

  return (
    <div className="mx-auto h-full max-w-md p-5 sm:p-8">
      <p className="text-sm font-medium">Data e horário</p>
      <div className="mt-3 flex h-11 items-center gap-2.5 rounded-[10px] border border-line bg-raised px-3.5 text-[15px]">
        <Search className="size-4 text-faint" />
        <span className="flex items-center whitespace-pre" aria-label={texto}>
          {texto.slice(0, digitados)}
          <span
            aria-hidden
            className={`ml-px h-[1.1em] w-px bg-fg ${digitados < texto.length ? "" : "animate-piscar"}`}
          />
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={digitados < texto.length ? { opacity: 0, y: 6 } : { opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4, ease: suavidade }}
      >
        <p className="mt-5 text-sm text-muted">
          Horários disponíveis <span className="text-fg">sexta, 24/10, à tarde</span>:
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          {["13:00", "14:15", "15:30", "16:45"].map((h) => (
            <span
              key={h}
              className="flex h-10 items-center justify-center gap-1.5 rounded-[8px] border border-line text-sm"
            >
              <span className="text-muted">sex 24</span>
              <span className="font-mono font-medium">{h}</span>
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs text-faint">
          Interpretado por regras, sem modelo de linguagem. Os horários vêm do cálculo real de
          disponibilidade.
        </p>
      </motion.div>
    </div>
  );
}

const demanda = [
  [0, 0, 0, 0, 1, 0, 0, 0, 2, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 3, 1],
  [0, 0, 0, 0, 0, 0, 0, 2, 3, 2],
  [0, 2, 2, 0, 0, 4, 4, 3, 0, 0],
  [1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
];

function TelaDemanda() {
  return (
    <div className="mx-auto h-full max-w-lg p-5 sm:p-8">
      <p className="text-sm font-medium">Demanda perdida · últimos 30 dias</p>
      <Indicadores
        className="mt-3"
        truncar
        itens={[
          ["Pedidos sem horário", "61"],
          ["Fora do expediente", "43"],
          ["Agenda cheia", "18"],
        ]}
      />
      <div className="mt-4 grid grid-cols-[1.75rem_repeat(10,1fr)] gap-1">
        {demanda.map((linha, dia) => (
          <div key={dia} className="contents">
            <span className="self-center font-mono text-[9px] text-faint">
              {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"][dia]}
            </span>
            {linha.map((nivel, hora) => (
              <motion.span
                key={hora}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + (dia + hora) * 0.015, duration: 0.35, ease: suavidade }}
                className="h-4 rounded-[3px]"
                style={{
                  background: `color-mix(in oklab, var(--fg) ${nivel ? 12 + nivel * 18 : 5}%, transparent)`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4, ease: suavidade }}
        className="mt-4 flex items-start gap-2.5 rounded-[8px] bg-inverse p-3 text-[13px] text-on-inverse"
      >
        <Lightbulb className="mt-0.5 size-4 shrink-0 opacity-70" />
        <span>
          Abrir <span className="font-semibold">sábado das 14h às 17h</span> teria atendido{" "}
          <span className="font-semibold">20 pedidos</span>.
        </span>
      </motion.div>
    </div>
  );
}

function TelaCorrida() {
  const vencedor = 13;
  return (
    <div className="mx-auto h-full max-w-md p-5 sm:p-8">
      <p className="text-sm font-medium">20 pedidos para quarta, 10:15, no mesmo instante</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: 20 }, (_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.03, duration: 0.3, ease: suavidade }}
            className={`grid h-10 place-items-center rounded-[8px] font-mono text-xs ${
              i + 1 === vencedor
                ? "bg-ok text-white dark:text-canvas"
                : "border border-line text-faint line-through"
            }`}
          >
            {i + 1}
          </motion.div>
        ))}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="mt-4 text-sm text-muted"
      >
        <span className="font-medium text-ok">1 aceito</span>,{" "}
        <span className="text-fg">19 recusados</span>. A trava por negócio e a restrição de exclusão
        no PostgreSQL garantem que só um fica com o horário.
      </motion.p>
    </div>
  );
}
