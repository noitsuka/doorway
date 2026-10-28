"use client";

import { useEffect, useState } from "react";
import { Check, Coffee, CopyCheck, X } from "lucide-react";

import { notificar } from "@/components/notificacao";
import { Aviso, Botao, Esqueleto } from "@/components/ui";
import { api, textoDoErro } from "@/lib/api";
import { minutosDoHorario } from "@/lib/formatacao";
import type { Horario } from "@/lib/tipos";

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const OPCOES = Array.from({ length: 37 }, (_, i) => {
  const minutos = 5 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${minutos % 60 ? "30" : "00"}`;
});

type Pausa = { inicio: string; fim: string };
type Dia = { aberto: boolean; abre: string; fecha: string; pausa: Pausa | null };
type Semana = Dia[];

const PADRAO: Dia = { aberto: false, abre: "09:00", fecha: "18:00", pausa: null };
const ALMOCO: Pausa = { inicio: "12:00", fim: "13:00" };

const MODELOS: { rotulo: string; dias: number[]; pausa: Pausa | null }[] = [
  { rotulo: "Seg a sex, 9h às 18h", dias: [0, 1, 2, 3, 4], pausa: null },
  { rotulo: "Seg a sáb, 9h às 18h", dias: [0, 1, 2, 3, 4, 5], pausa: null },
  { rotulo: "Seg a sex com almoço", dias: [0, 1, 2, 3, 4], pausa: ALMOCO },
];

function paraSemana(horarios: Horario[]): Semana {
  return DIAS_SEMANA.map((_, dia) => {
    const intervalos = horarios
      .filter((h) => h.dia_semana === dia)
      .map((h) => ({ abre: h.abre_as.slice(0, 5), fecha: h.fecha_as.slice(0, 5) }))
      .sort((a, b) => a.abre.localeCompare(b.abre));
    if (!intervalos.length) return { ...PADRAO };
    const [primeiro, segundo] = intervalos;
    return {
      aberto: true,
      abre: primeiro.abre,
      fecha: intervalos[intervalos.length - 1].fecha,
      pausa: segundo ? { inicio: primeiro.fecha, fim: segundo.abre } : null,
    };
  });
}

function paraApi(semana: Semana) {
  return semana.flatMap((d, dia_semana) => {
    if (!d.aberto) return [];
    if (!d.pausa) return [{ dia_semana, abre_as: d.abre, fecha_as: d.fecha }];
    return [
      { dia_semana, abre_as: d.abre, fecha_as: d.pausa.inicio },
      { dia_semana, abre_as: d.pausa.fim, fecha_as: d.fecha },
    ];
  });
}

function problema(d: Dia): string | undefined {
  if (!d.aberto) return;
  if (d.abre >= d.fecha) return "O horário de abertura precisa ser antes do fechamento.";
  if (
    d.pausa &&
    !(d.abre < d.pausa.inicio && d.pausa.inicio < d.pausa.fim && d.pausa.fim < d.fecha)
  )
    return "A pausa precisa ficar dentro do horário de atendimento.";
}

function horasAbertas(semana: Semana) {
  const minutos = semana.reduce((soma, d) => {
    if (!d.aberto || problema(d)) return soma;
    const pausa = d.pausa ? minutosDoHorario(d.pausa.fim) - minutosDoHorario(d.pausa.inicio) : 0;
    return soma + minutosDoHorario(d.fecha) - minutosDoHorario(d.abre) - pausa;
  }, 0);
  return Math.round((minutos / 60) * 10) / 10;
}

export function PaginaDeHorarios() {
  const [semana, setSemana] = useState<Semana>();
  const [salva, setSalva] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api<Horario[]>("/horarios")
      .then((horarios) => {
        const carregada = paraSemana(horarios);
        setSemana(carregada);
        setSalva(JSON.stringify(paraApi(carregada)));
      })
      .catch((e) => setErro(textoDoErro(e)));
  }, []);

  const problemas = semana?.map(problema) ?? [];
  const temProblema = problemas.some(Boolean);
  const alterada = semana !== undefined && JSON.stringify(paraApi(semana)) !== salva;
  const abertos = semana?.filter((d) => d.aberto).length ?? 0;

  function atualizar(dia: number, mudanca: Partial<Dia>) {
    setSemana((atual) => atual!.map((d, i) => (i === dia ? { ...d, ...mudanca } : d)));
  }

  function aplicarModelo(modelo: (typeof MODELOS)[number]) {
    setSemana(
      DIAS_SEMANA.map((_, dia) =>
        modelo.dias.includes(dia)
          ? { aberto: true, abre: "09:00", fecha: "18:00", pausa: modelo.pausa }
          : { ...PADRAO },
      ),
    );
  }

  function aplicarATodos(origem: number) {
    const base = semana![origem];
    setSemana((atual) =>
      atual!.map((d) => (d.aberto ? { ...base, pausa: base.pausa && { ...base.pausa } } : d)),
    );
    notificar("Horário aplicado a todos os dias abertos.");
  }

  async function salvar() {
    if (!semana || temProblema) return;
    setSalvando(true);
    setErro(undefined);
    try {
      const gravados = await api<Horario[]>("/horarios", { method: "PUT", json: paraApi(semana) });
      const gravada = paraSemana(gravados);
      setSemana(gravada);
      setSalva(JSON.stringify(paraApi(gravada)));
      notificar("Horários salvos. A sua página já mostra os novos horários.");
    } catch (e) {
      setErro(textoDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Horários
          </h1>
          <p className="mt-2 max-w-lg text-muted">
            Defina quando você atende. Os clientes só veem horários dentro desse período.
          </p>
        </div>
        <div className="hidden sm:block">
          <Botao
            variante="destaque"
            onClick={salvar}
            carregando={salvando}
            disabled={!alterada || temProblema}
          >
            {alterada ? (
              "Salvar alterações"
            ) : (
              <>
                <Check className="size-4" /> Tudo salvo
              </>
            )}
          </Botao>
        </div>
      </div>

      {erro && (
        <div className="mt-6">
          <Aviso>{erro}</Aviso>
        </div>
      )}

      {!semana ? (
        <Esqueleto className="mt-8 h-[32rem] rounded-panel" />
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted">Começar com:</span>
            {MODELOS.map((modelo) => (
              <button
                key={modelo.rotulo}
                type="button"
                onClick={() => aplicarModelo(modelo)}
                className="h-9 rounded-full border border-line bg-raised px-3.5 text-sm font-medium transition-colors hover:border-fg/30"
              >
                {modelo.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-panel border border-line bg-raised">
            <p className="border-b border-line px-4 py-3 text-sm text-muted sm:px-5">
              {abertos
                ? `Aberto ${abertos} ${abertos === 1 ? "dia" : "dias"} por semana, ${String(horasAbertas(semana)).replace(".", ",")} horas no total.`
                : "Fechado todos os dias. Ative pelo menos um dia para receber agendamentos."}
            </p>
            <ul className="divide-y divide-line">
              {semana.map((dia, indice) => (
                <LinhaDoDia
                  key={DIAS_SEMANA[indice]}
                  rotulo={DIAS_SEMANA[indice]}
                  dia={dia}
                  problema={problemas[indice]}
                  aoMudar={(mudanca) => atualizar(indice, mudanca)}
                  aoAplicarATodos={abertos > 1 ? () => aplicarATodos(indice) : undefined}
                />
              ))}
            </ul>
          </div>
        </>
      )}

      {alterada && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 animate-surgir px-5 sm:hidden">
          <Botao
            variante="destaque"
            tamanho="grande"
            className="w-full shadow-3"
            onClick={salvar}
            carregando={salvando}
            disabled={temProblema}
          >
            Salvar alterações
          </Botao>
        </div>
      )}
    </>
  );
}

function Interruptor({
  ligado,
  rotulo,
  aoMudar,
}: {
  ligado: boolean;
  rotulo: string;
  aoMudar: (ligado: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${ligado ? "bg-fg" : "bg-fg/15"}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full shadow-sm transition-[transform,background-color] duration-300 ease-(--ease-out-expo) ${
          ligado ? "translate-x-5 bg-canvas" : "bg-white"
        }`}
      />
    </button>
  );
}

function SeletorDeHora({
  valor,
  rotulo,
  aoMudar,
}: {
  valor: string;
  rotulo: string;
  aoMudar: (valor: string) => void;
}) {
  const opcoes = OPCOES.includes(valor) ? OPCOES : [...OPCOES, valor].sort();
  return (
    <select
      aria-label={rotulo}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      className="h-10 rounded-control border border-line-strong bg-canvas px-2.5 font-mono text-[15px] tabular transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none"
    >
      {opcoes.map((opcao) => (
        <option key={opcao} value={opcao}>
          {opcao}
        </option>
      ))}
    </select>
  );
}

function LinhaDoDia({
  rotulo,
  dia,
  problema,
  aoMudar,
  aoAplicarATodos,
}: {
  rotulo: string;
  dia: Dia;
  problema?: string;
  aoMudar: (mudanca: Partial<Dia>) => void;
  aoAplicarATodos?: () => void;
}) {
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex w-36 items-center gap-3">
          <Interruptor
            ligado={dia.aberto}
            rotulo={`${rotulo}: ${dia.aberto ? "aberto" : "fechado"}`}
            aoMudar={(aberto) => aoMudar({ aberto })}
          />
          <span className={`font-medium ${dia.aberto ? "" : "text-faint"}`}>{rotulo}</span>
        </div>

        {dia.aberto ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">das</span>
            <SeletorDeHora
              rotulo={`${rotulo}, abertura`}
              valor={dia.abre}
              aoMudar={(abre) => aoMudar({ abre })}
            />
            <span className="text-muted">às</span>
            <SeletorDeHora
              rotulo={`${rotulo}, fechamento`}
              valor={dia.fecha}
              aoMudar={(fecha) => aoMudar({ fecha })}
            />
          </div>
        ) : (
          <span className="text-sm text-faint">Fechado</span>
        )}
      </div>

      {dia.aberto && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:pl-40">
          {dia.pausa ? (
            <div className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto">
              <span className="flex w-full items-center gap-1.5 text-muted sm:w-auto">
                <Coffee className="size-4" /> Pausa
                <button
                  type="button"
                  onClick={() => aoMudar({ pausa: null })}
                  aria-label={`Remover pausa de ${rotulo}`}
                  className="ml-auto grid size-8 place-items-center rounded-full text-faint transition-colors hover:bg-fg/[0.06] hover:text-fg sm:hidden"
                >
                  <X className="size-4" />
                </button>
              </span>
              <span className="text-muted">das</span>
              <SeletorDeHora
                rotulo={`${rotulo}, início da pausa`}
                valor={dia.pausa.inicio}
                aoMudar={(inicio) => aoMudar({ pausa: { ...dia.pausa!, inicio } })}
              />
              <span className="text-muted">às</span>
              <SeletorDeHora
                rotulo={`${rotulo}, fim da pausa`}
                valor={dia.pausa.fim}
                aoMudar={(fim) => aoMudar({ pausa: { ...dia.pausa!, fim } })}
              />
              <button
                type="button"
                onClick={() => aoMudar({ pausa: null })}
                aria-label={`Remover pausa de ${rotulo}`}
                className="hidden size-9 place-items-center rounded-full text-faint transition-colors hover:bg-fg/[0.06] hover:text-fg sm:grid"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => aoMudar({ pausa: { ...ALMOCO } })}
              className="inline-flex h-8 items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors hover:text-fg"
            >
              <Coffee className="size-4" /> Adicionar pausa
            </button>
          )}
          {aoAplicarATodos && (
            <button
              type="button"
              onClick={aoAplicarATodos}
              className="inline-flex h-8 items-center gap-1.5 rounded-control text-sm font-medium text-muted transition-colors hover:text-fg"
            >
              <CopyCheck className="size-4" /> Aplicar a todos os dias abertos
            </button>
          )}
        </div>
      )}
      {problema && <p className="mt-2 text-[13px] font-medium text-danger sm:pl-40">{problema}</p>}
    </li>
  );
}
