"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CalendarX2, Link2, Mail, MessageCircle } from "lucide-react";

import { Gaveta } from "@/components/gaveta";
import { NumeroAnimado } from "@/components/numero-animado";
import { notificar } from "@/components/notificacao";
import { SeletorDeDias } from "@/components/seletor-de-dias";
import { Botao, Esqueleto } from "@/components/ui";
import { api, textoDoErro } from "@/lib/api";
import {
  dataLonga,
  diaLocal,
  dinheiro,
  hojeEm,
  hora,
  indiceDiaSemana,
  minutosDoDia,
  minutosDoHorario,
  saudacao,
  segundaDe,
  somarDias,
} from "@/lib/formatacao";
import type { Agendamento, AgendaDoDia, Horario } from "@/lib/tipos";
import { exibirTelefone } from "@/lib/validacao";
import { useSessao } from "./sessao";

const PX_POR_MINUTO = 1.25;
const ATUALIZAR_MS = 12_000;
const DIAS_ANTES = 30;
const DIAS_NA_FAIXA = 120;

export function PaginaDaAgenda() {
  const { negocio, nome } = useSessao();
  const fuso = negocio.fuso_horario;
  const hoje = hojeEm(fuso);
  const [selecionado, setSelecionado] = useState(hoje);
  const [semana, setSemana] = useState<{ segunda: string; itens: Agendamento[] }>();
  const [porDia, setPorDia] = useState<Record<string, number>>();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [aberto, setAberto] = useState<Agendamento>();

  const segunda = segundaDe(selecionado);
  const primeiroDia = somarDias(hoje, -DIAS_ANTES);
  const dias = useMemo(
    () => Array.from({ length: DIAS_NA_FAIXA }, (_, i) => somarDias(primeiroDia, i)),
    [primeiroDia],
  );
  const agendamentos = semana?.segunda === segunda ? semana.itens : undefined;
  const diasAbertos = new Set(horarios.map((h) => h.dia_semana));

  useEffect(() => {
    let ativo = true;
    api<AgendaDoDia[]>(`/agendamentos/por-dia?de=${primeiroDia}&quantidade=${DIAS_NA_FAIXA}`)
      .then(
        (dados) => ativo && setPorDia(Object.fromEntries(dados.map((d) => [d.data, d.quantidade]))),
      )
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [primeiroDia, semana]);

  useEffect(() => {
    api<Horario[]>("/horarios")
      .then(setHorarios)
      .catch(() => setHorarios([]));
  }, []);

  useEffect(() => {
    let ativo = true;
    let conhecidos: Set<number> | undefined;
    let ultimo = "";
    const inicio = `${somarDias(segunda, -1)}T00:00:00Z`;
    const fim = `${somarDias(segunda, 8)}T00:00:00Z`;
    const naSemana = new Set(Array.from({ length: 7 }, (_, i) => somarDias(segunda, i)));

    const carregar = (silencioso: boolean) =>
      api<Agendamento[]>(`/agendamentos?inicio=${inicio}&fim=${fim}`)
        .then((dados) => {
          if (!ativo) return;
          const itens = dados.filter((a) => naSemana.has(diaLocal(a.inicio, fuso)));
          if (conhecidos) {
            for (const a of itens.filter((item) => !conhecidos!.has(item.id))) {
              notificar(
                `Novo agendamento: ${a.nome_cliente.split(" ")[0]} às ${hora(a.inicio, fuso)}`,
              );
            }
          }
          conhecidos = new Set(itens.map((a) => a.id));
          const retrato = JSON.stringify(itens);
          if (retrato === ultimo) return;
          ultimo = retrato;
          setSemana({ segunda, itens });
        })
        .catch((e) => ativo && !silencioso && notificar(textoDoErro(e), "erro"));

    carregar(false);
    const aoVoltar = () => document.visibilityState === "visible" && carregar(true);
    const relogio = setInterval(aoVoltar, ATUALIZAR_MS);
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [segunda, fuso]);

  const cancelar = useCallback(async (agendamento: Agendamento) => {
    await api(`/agendamentos/${agendamento.id}/cancelar`, { method: "POST" });
    setSemana(
      (atual) => atual && { ...atual, itens: atual.itens.filter((a) => a.id !== agendamento.id) },
    );
    setAberto(undefined);
    notificar("Horário cancelado e liberado na sua página.");
  }, []);

  const bloquear = useCallback(async (agendamento: Agendamento) => {
    const { cancelados } = await api<{ cancelados: number }>("/bloqueios", {
      method: "POST",
      json: { agendamento_id: agendamento.id },
    });
    const agora = Date.now();
    setSemana(
      (atual) =>
        atual && {
          ...atual,
          itens: atual.itens.filter(
            (a) =>
              !(
                (agendamento.email_cliente && a.email_cliente === agendamento.email_cliente) ||
                (agendamento.telefone_cliente &&
                  a.telefone_cliente === agendamento.telefone_cliente)
              ) || new Date(a.inicio).getTime() <= agora,
          ),
        },
    );
    setAberto(undefined);
    notificar(
      cancelados
        ? `Cliente bloqueado. ${cancelados} ${cancelados === 1 ? "agendamento futuro cancelado" : "agendamentos futuros cancelados"}.`
        : "Cliente bloqueado.",
    );
  }, []);

  const doDia = (dia: string) =>
    agendamentos?.filter((a) => diaLocal(a.inicio, fuso) === dia) ?? [];
  const receita = agendamentos?.reduce((soma, a) => soma + a.servico.preco_centavos, 0) ?? 0;
  const primeiroNome = nome.split(" ")[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            {saudacao(fuso)}, {primeiroNome}.
          </h1>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-panel border border-line bg-raised sm:grid-cols-3">
        <Indicador rotulo="Hoje" valor={porDia?.[hoje]} />
        <Indicador ultimo rotulo="Na semana" valor={agendamentos?.length} />
        <Indicador
          rotulo="Receita prevista"
          valor={agendamentos ? receita : undefined}
          formatar={dinheiro}
          destaque
        />
      </div>

      <SeletorDeDias
        className="mt-8"
        dias={dias}
        hoje={hoje}
        valor={selecionado}
        aoMudar={setSelecionado}
        marcado={(dia) => (porDia?.[dia] ?? 0) > 0}
        legenda="dias com agendamentos"
        rotulo={(dia) => {
          const quantidade = porDia?.[dia];
          if (quantidade === undefined) return undefined;
          if (quantidade > 0) {
            return {
              texto: `${quantidade} ${quantidade === 1 ? "cliente" : "clientes"}`,
              tom: "destaque",
            };
          }
          return {
            texto: diasAbertos.has(indiceDiaSemana(dia)) ? "livre" : "fechado",
            tom: "apagado",
          };
        }}
        acoes={
          selecionado !== hoje && (
            <button
              type="button"
              onClick={() => setSelecionado(hoje)}
              className="inline-flex h-9 items-center rounded-control border border-line px-3 text-sm font-medium text-muted transition-colors hover:border-fg/30 hover:text-fg"
            >
              Hoje
            </button>
          )
        }
      />

      <section className="mt-6">
        {!agendamentos ? (
          <Esqueleto className="h-[28rem] rounded-panel" />
        ) : (
          <LinhaDoTempo
            dia={selecionado}
            hoje={hoje}
            fuso={fuso}
            horarios={horarios.filter((h) => h.dia_semana === indiceDiaSemana(selecionado))}
            agendamentos={doDia(selecionado)}
            aoAbrir={setAberto}
          />
        )}
      </section>

      <Gaveta aberta={Boolean(aberto)} titulo="Agendamento" aoFechar={() => setAberto(undefined)}>
        {aberto && (
          <DetalhesDoAgendamento
            key={aberto.id}
            agendamento={aberto}
            grupo={(agendamentos ?? []).filter((a) => a.grupo && a.grupo === aberto.grupo)}
            fuso={fuso}
            aoCancelar={cancelar}
            aoBloquear={bloquear}
          />
        )}
      </Gaveta>
    </>
  );
}

function Indicador({
  rotulo,
  valor,
  formatar,
  destaque,
  ultimo,
}: {
  rotulo: string;
  valor?: number;
  formatar?: (valor: number) => string;
  destaque?: boolean;
  ultimo?: boolean;
}) {
  return (
    <div
      className={`border-line p-4 sm:p-6 ${destaque ? "col-span-2 bg-inverse text-on-inverse sm:col-span-1" : `border-b sm:border-r sm:border-b-0 ${ultimo ? "" : "border-r"}`}`}
    >
      <p className={`text-xs sm:text-sm ${destaque ? "opacity-60" : "text-muted"}`}>{rotulo}</p>
      {valor === undefined ? (
        <Esqueleto className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1.5 truncate font-mono text-xl font-semibold tracking-tight tabular sm:text-3xl">
          <NumeroAnimado valor={valor} formatar={formatar} desdeZero />
        </p>
      )}
    </div>
  );
}

function LinhaDoTempo({
  dia,
  hoje,
  fuso,
  horarios,
  agendamentos,
  aoAbrir,
}: {
  dia: string;
  hoje: string;
  fuso: string;
  horarios: Horario[];
  agendamentos: Agendamento[];
  aoAbrir: (agendamento: Agendamento) => void;
}) {
  const intervalos = horarios.map(
    (h) => [minutosDoHorario(h.abre_as), minutosDoHorario(h.fecha_as)] as const,
  );
  const itens = agendamentos.map((a) => ({
    agendamento: a,
    inicio: minutosDoDia(a.inicio, fuso),
    fim: minutosDoDia(a.inicio, fuso) + a.servico.duracao_minutos,
  }));
  const bordas = [...intervalos.flat(), ...itens.flatMap((i) => [i.inicio, i.fim])];
  const primeira = Math.floor(Math.min(8 * 60, ...bordas) / 60);
  const ultima = Math.min(24, Math.ceil(Math.max(19 * 60, ...bordas) / 60));
  const topo = (minutos: number) => (minutos - primeira * 60) * PX_POR_MINUTO;
  const altura = (ultima - primeira) * 60 * PX_POR_MINUTO;

  const [relogio, setRelogio] = useState(() => minutosDoDia(new Date().toISOString(), fuso));
  useEffect(() => {
    const temporizador = setInterval(
      () => setRelogio(minutosDoDia(new Date().toISOString(), fuso)),
      60_000,
    );
    return () => clearInterval(temporizador);
  }, [fuso]);
  const agora = dia === hoje ? relogio : undefined;

  const fechado = intervalos.length === 0;

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-raised">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <p className="truncate font-semibold">
          {agendamentos.length
            ? `${agendamentos.length} ${agendamentos.length === 1 ? "atendimento" : "atendimentos"}`
            : fechado
              ? "Fechado"
              : "Nenhum atendimento"}
        </p>
        {!fechado && (
          <p className="hidden shrink-0 font-mono text-sm text-muted tabular sm:block">
            {[...horarios]
              .sort((a, b) => a.abre_as.localeCompare(b.abre_as))
              .map((h) => `${h.abre_as.slice(0, 5)} às ${h.fecha_as.slice(0, 5)}`)
              .join(" · ")}
          </p>
        )}
      </div>

      {agendamentos.length === 0 && (
        <div className="flex items-center gap-3 border-b border-line px-5 py-3 text-sm text-muted">
          <CalendarX2 className="size-4 shrink-0" />
          {fechado
            ? "Você não atende neste dia. Ajuste em Horários se quiser abrir."
            : "Nenhum agendamento ainda. Compartilhe seu link para encher este dia."}
        </div>
      )}

      <div className="relative mt-5 mr-3 ml-16 sm:mr-5 sm:ml-20" style={{ height: altura }}>
        {Array.from({ length: ultima - primeira + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute inset-x-0 border-t border-line"
            style={{ top: i * 60 * PX_POR_MINUTO }}
          >
            <span className="absolute -top-2.5 -left-14 w-11 text-right font-mono text-xs text-faint tabular sm:-left-16">
              {String(primeira + i).padStart(2, "0")}:00
            </span>
          </div>
        ))}

        {faixasFechadas(intervalos, primeira * 60, ultima * 60).map(([de, ate]) => (
          <div
            key={de}
            aria-hidden
            className="absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent_0_7px,var(--line)_7px_8px)] opacity-70"
            style={{ top: topo(de), height: (ate - de) * PX_POR_MINUTO }}
          />
        ))}

        {itens.map(({ agendamento: a, inicio, fim }) => {
          const compacto = fim - inicio < 40;
          const minimo = fim - inicio < 25;
          return (
            <button
              key={a.id}
              onClick={() => aoAbrir(a)}
              aria-label={`${a.nome_cliente}, ${hora(a.inicio, fuso)}, ${a.servico.nome}`}
              className={`absolute inset-x-1 flex animate-enter overflow-hidden border border-line bg-surface px-3 text-left transition-colors duration-150 hover:border-line-strong hover:bg-fg/[0.06] ${
                minimo ? "rounded-md text-xs leading-none" : "rounded-control text-sm"
              }`}
              style={{
                top: topo(inicio) + 1,
                height: Math.max((fim - inicio) * PX_POR_MINUTO - 2, 14),
              }}
            >
              <span
                className={`flex min-w-0 flex-1 gap-x-3 ${compacto ? "items-center" : "flex-col justify-center"}`}
              >
                <span
                  className={`flex items-center gap-1.5 truncate font-semibold ${compacto ? "max-w-[65%] shrink-0" : ""}`}
                >
                  {a.grupo && (
                    <Link2
                      aria-label="Reserva em grupo"
                      className="size-3.5 shrink-0 text-accent"
                    />
                  )}
                  <span className="truncate">{a.nome_cliente}</span>
                </span>
                <span className="min-w-0 truncate text-muted">
                  <span className="font-mono">{hora(a.inicio, fuso)}</span> · {a.servico.nome}
                </span>
              </span>
            </button>
          );
        })}

        {agora !== undefined && agora >= primeira * 60 && agora <= ultima * 60 && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-danger"
            style={{ top: topo(agora) }}
          >
            <span className="absolute -top-[5px] -left-1.5 size-3 rounded-full bg-danger" />
          </div>
        )}
      </div>
      <div className="h-4" />
    </div>
  );
}

function faixasFechadas(intervalos: (readonly [number, number])[], de: number, ate: number) {
  const faixas: [number, number][] = [];
  let cursor = de;
  for (const [abre, fecha] of [...intervalos].sort((a, b) => a[0] - b[0])) {
    if (abre > cursor) faixas.push([cursor, Math.min(abre, ate)]);
    cursor = Math.max(cursor, fecha);
  }
  if (cursor < ate) faixas.push([cursor, ate]);
  return faixas;
}

function DetalhesDoAgendamento({
  agendamento: a,
  grupo,
  fuso,
  aoCancelar,
  aoBloquear,
}: {
  agendamento: Agendamento;
  grupo: Agendamento[];
  fuso: string;
  aoCancelar: (agendamento: Agendamento) => Promise<void>;
  aoBloquear: (agendamento: Agendamento) => Promise<void>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [bloqueando, setBloqueando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [comecou] = useState(() => new Date(a.inicio).getTime() <= Date.now());
  const digitos = a.telefone_cliente?.replace(/\D/g, "");
  const whatsapp =
    digitos &&
    digitos.length >= 10 &&
    `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;

  return (
    <div className="space-y-6 pb-2">
      <div>
        <p className="text-2xl font-bold tracking-tight">{a.nome_cliente}</p>
        <p className="mt-1 text-muted">{a.servico.nome}</p>
      </div>
      {grupo.length > 1 && (
        <div className="rounded-panel border border-accent/25 bg-accent-soft/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4 text-accent" /> Reserva em grupo
          </p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {grupo.map((g) => (
              <li key={g.id} className="flex gap-3">
                <span className="font-mono text-muted tabular">{hora(g.inicio, fuso)}</span>
                <span className={g.id === a.id ? "font-semibold" : ""}>{g.nome_cliente}</span>
                <span className="truncate text-muted">{g.servico.nome}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-line bg-line">
        {[
          ["Data", dataLonga(a.inicio, fuso)],
          ["Horário", `${hora(a.inicio, fuso)} às ${hora(a.fim, fuso)}`],
          ["Valor", dinheiro(a.servico.preco_centavos)],
          ["Telefone", a.telefone_cliente ? exibirTelefone(a.telefone_cliente) : "Não informado"],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="bg-raised p-4">
            <dt className="text-xs text-faint">{rotulo}</dt>
            <dd className="mt-1 font-medium first-letter:uppercase">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-2 sm:grid-cols-2">
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-ok px-4 font-semibold text-white transition-[filter] hover:brightness-110 dark:text-canvas"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        {a.email_cliente && (
          <a
            href={`mailto:${a.email_cliente}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-strong px-4 font-semibold hover:border-fg/40"
          >
            <Mail className="size-4" /> E-mail
          </a>
        )}
      </div>

      <div className="border-t border-line pt-6">
        {confirmando ? (
          <div className="rounded-panel bg-danger-soft p-4">
            <p className="font-semibold text-danger">Cancelar este agendamento?</p>
            <p className="mt-1 text-sm text-muted">
              O horário volta a ficar disponível na sua página.
            </p>
            <div className="mt-4 flex gap-2">
              <Botao
                variante="primario"
                className="bg-danger! text-white!"
                carregando={carregando}
                onClick={async () => {
                  setCarregando(true);
                  try {
                    await aoCancelar(a);
                  } catch (e) {
                    notificar(textoDoErro(e), "erro");
                    setCarregando(false);
                  }
                }}
              >
                Sim, cancelar
              </Botao>
              <Botao variante="fantasma" onClick={() => setConfirmando(false)}>
                Voltar
              </Botao>
            </div>
          </div>
        ) : bloqueando ? (
          <div className="rounded-panel border border-line p-4">
            <p className="font-semibold">Bloquear este cliente?</p>
            <p className="mt-1 text-sm text-muted">
              Os agendamentos futuros dele serão cancelados, e novas reservas com o mesmo telefone
              ou e-mail serão recusadas. Você pode desbloquear depois em Página.
            </p>
            <div className="mt-4 flex gap-2">
              <Botao
                variante="primario"
                carregando={carregando}
                onClick={async () => {
                  setCarregando(true);
                  try {
                    await aoBloquear(a);
                  } catch (e) {
                    notificar(textoDoErro(e), "erro");
                    setCarregando(false);
                  }
                }}
              >
                Bloquear
              </Botao>
              <Botao variante="fantasma" onClick={() => setBloqueando(false)}>
                Voltar
              </Botao>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {comecou ? (
              <p className="rounded-control bg-fg/[0.04] px-4 py-3 text-center text-sm text-muted">
                Esse atendimento já começou e não pode mais ser cancelado.
              </p>
            ) : (
              <Botao variante="perigo" className="w-full" onClick={() => setConfirmando(true)}>
                Cancelar agendamento
              </Botao>
            )}
            <button
              type="button"
              onClick={() => setBloqueando(true)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 text-sm font-medium text-muted transition-colors hover:text-fg"
            >
              <Ban className="size-4" /> Bloquear cliente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
