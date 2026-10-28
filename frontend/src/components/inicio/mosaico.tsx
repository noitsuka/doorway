import Link from "next/link";
import { ArrowRight, CalendarSync, Lightbulb, Link2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

const horarios = [
  "09:00",
  "09:45",
  "10:00",
  "10:15",
  "13:00",
  "13:15",
  "14:30",
  "15:00",
  "15:15",
  "16:00",
  "17:30",
  "18:00",
];
const ESCOLHIDO = "10:15";

const demanda = [
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 2, 1],
  [0, 0, 0, 0, 0, 0, 0, 1, 3, 1],
  [0, 0, 0, 0, 0, 0, 0, 2, 3, 2],
  [0, 3, 2, 0, 0, 0, 4, 4, 3, 0],
  [2, 2, 1, 0, 0, 1, 1, 0, 0, 0],
];

const grupo = [
  ["09:00", "Carlos", "Corte + barba"],
  ["10:00", "Pedro", "Corte"],
  ["10:30", "Davi", "Corte"],
] as const;

function Bloco({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-panel border border-line bg-raised ${className}`}>
      {children}
    </div>
  );
}

function Texto({
  titulo,
  texto,
  link,
}: {
  titulo: string;
  texto: string;
  link?: [string, string];
}) {
  return (
    <div>
      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{titulo}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">{texto}</p>
      {link && (
        <Link
          href={link[0]}
          className="group mt-3 inline-flex items-center gap-1 text-[15px] text-link"
        >
          {link[1]}
          <ArrowRight className="size-3.5 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Moldura({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="mt-6 rounded-[8px] border border-line bg-canvas p-3 sm:p-4">
      {children}
    </div>
  );
}

export function Mosaico() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Bloco className="grid gap-6 p-5 sm:p-6 md:col-span-2 md:grid-cols-[0.9fr_1.1fr] md:items-center">
        <Texto
          titulo="Horários calculados na hora"
          texto="Cada serviço tem sua duração. O cliente só vê os horários em que o atendimento cabe inteiro, respeitando pausas e o que já está marcado. Nada de tabela de horários para manter."
          link={["/como-foi-feito", "Ver como foi feito"]}
        />
        <div aria-hidden className="rounded-[8px] border border-line bg-canvas p-3 sm:p-4">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {["Corte · 30 min", "Corte + barba · 1h", "Barba · 30 min"].map((s, i) => (
              <span
                key={s}
                className={`rounded-full border px-2.5 py-1 ${i === 1 ? "border-fg/40 text-fg" : "border-line text-muted"}`}
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {horarios.map((horario) => (
              <span
                key={horario}
                className={`grid h-9 place-items-center rounded-[6px] border font-mono text-[12px] ${
                  horario === ESCOLHIDO ? "border-fg bg-fg text-canvas" : "border-line"
                }`}
              >
                {horario}
              </span>
            ))}
          </div>
        </div>
      </Bloco>

      <Bloco className="grid gap-6 p-5 sm:p-6 md:col-span-2 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div
          aria-hidden
          className="order-2 rounded-[8px] border border-line bg-canvas p-3 sm:p-4 md:order-1"
        >
          <div className="grid grid-cols-[2rem_repeat(10,1fr)] gap-1">
            {demanda.map((linha, dia) => (
              <div key={dia} className="contents">
                <span className="self-center font-mono text-[10px] text-faint">
                  {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"][dia]}
                </span>
                {linha.map((nivel, hora) => (
                  <span
                    key={hora}
                    className="h-4 rounded-[4px] sm:h-5"
                    style={{
                      background: nivel
                        ? `color-mix(in oklab, var(--fg) ${12 + nivel * 18}%, transparent)`
                        : "color-mix(in oklab, var(--fg) 4%, transparent)",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[13px] text-muted">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
            Abrir sábado das 14h às 17h teria atendido 20 pedidos.
          </p>
        </div>
        <div className="md:order-2">
          <Texto
            titulo="A demanda que você não vê"
            texto="Cada dia sem horário livre e cada busca sem resultado na sua página viram um mapa de calor. O painel separa o que caiu fora do expediente do que esbarrou na agenda cheia e diz qual horário vale abrir."
            link={["/como-foi-feito", "Como é medido"]}
          />
        </div>
      </Bloco>

      <Bloco className="p-5 sm:p-6">
        <Texto
          titulo="Reserva em grupo, tudo ou nada"
          texto="Pai e filhos, um grupo de amigas: até quatro pessoas em horários seguidos, cada uma com o seu serviço. Ou todos os horários são reservados juntos, ou nenhum."
        />
        <Moldura>
          <p className="flex items-center gap-2 text-sm font-medium">
            <UsersRound className="size-4 text-muted" /> 3 pessoas · sábado
          </p>
          <div className="mt-3 space-y-1.5 text-[13px]">
            {grupo.map(([horario, nome, servico]) => (
              <div key={nome} className="flex gap-3 rounded-[6px] bg-fg/[0.04] px-2.5 py-1.5">
                <span className="font-mono text-muted">{horario}</span>
                <span className="truncate">
                  {nome} <span className="text-muted">· {servico}</span>
                </span>
              </div>
            ))}
          </div>
        </Moldura>
      </Bloco>

      <Bloco className="p-5 sm:p-6">
        <Texto
          titulo="Cancelar ou remarcar sem login"
          texto="Cada reserva tem um link próprio, com um token aleatório de 43 caracteres. O cliente abre, troca o horário ou cancela, e o painel atualiza."
        />
        <Moldura>
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">Corte + barba · Barbearia Ferraz</p>
              <p className="text-muted">Sexta, 24 de outubro · 14:30</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-[13px]">
            <span className="rounded-[6px] bg-fg px-2.5 py-1 font-medium text-canvas">
              Remarcar
            </span>
            <span className="rounded-[6px] border border-line px-2.5 py-1 text-muted">
              Cancelar
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 truncate font-mono text-[11px] text-faint">
            <Link2 className="size-3 shrink-0" /> /agendamento/kQ3v9xT1bN...
          </p>
        </Moldura>
      </Bloco>

      <Bloco className="p-5 sm:p-6">
        <Texto
          titulo="Agenda no celular"
          texto="O dono assina um link no Google Agenda, no iPhone ou no Outlook e vê os atendimentos junto com os compromissos dele. Sem OAuth, sem aplicativo."
        />
        <Moldura>
          <p className="flex items-center gap-2 text-sm font-medium">
            <CalendarSync className="size-4 text-muted" /> Barbearia Ferraz
          </p>
          <div className="mt-3 space-y-1.5 text-[13px]">
            {[
              ["09:00", "Corte + barba · Rafael Souza"],
              ["10:15", "Corte masculino · Bruno Lima"],
              ["14:30", "Barba completa · Lucas Rocha"],
            ].map(([horario, rotulo]) => (
              <div key={horario} className="flex gap-3 rounded-[6px] bg-fg/[0.04] px-2.5 py-1.5">
                <span className="font-mono text-muted">{horario}</span>
                <span className="truncate">{rotulo}</span>
              </div>
            ))}
          </div>
        </Moldura>
      </Bloco>

      <Bloco className="p-5 sm:p-6">
        <Texto
          titulo="Uma página com a cara do negócio"
          texto="Foto, cor, categoria e frase de apresentação. Os quatro exemplos acima usam os mesmos componentes, cada um com o seu tema."
          link={["/#exemplos", "Ver os exemplos"]}
        />
        <Moldura>
          <div className="flex items-center gap-2">
            {["#b4532a", "#c2417a", "#0e7c66", "#7c3aed"].map((cor, i) => (
              <span
                key={cor}
                className={`size-7 rounded-full ${i === 3 ? "ring-2 ring-fg ring-offset-2 ring-offset-canvas" : ""}`}
                style={{ background: cor }}
              />
            ))}
            <span className="ml-auto font-mono text-xs text-muted">#7c3aed</span>
          </div>
        </Moldura>
      </Bloco>
    </div>
  );
}
