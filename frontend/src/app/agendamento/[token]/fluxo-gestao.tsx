"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CalendarPlus, CalendarX2, Repeat } from "lucide-react";

import { LogoMarca } from "@/components/logo";
import { notificar } from "@/components/notificacao";
import { FaixaDeDias, GradeDeHorarios } from "@/components/reserva/seletor-horario";
import { AlternarTema } from "@/components/tema";
import { Aviso, Botao, Esqueleto } from "@/components/ui";
import { api, ErroApi, textoDoErro } from "@/lib/api";
import { urlGoogleAgenda, urlOutlook } from "@/lib/calendario";
import { exibirTelefone } from "@/lib/validacao";
import { dataLonga, diaLocal, hora, preco } from "@/lib/formatacao";
import { estiloDaMarca } from "@/lib/marca";
import type { AgendamentoGerenciado } from "@/lib/tipos";

type Modo = "ver" | "remarcar" | "cancelar";

const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

export function FluxoGestao({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return TOKEN.test(token) ? <Fluxo token={token} /> : <NaoEncontrado />;
}

function NaoEncontrado() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <LogoMarca className="mx-auto size-14" />
        <h1 className="mt-8 font-display text-4xl font-medium tracking-[-0.03em]">
          Agendamento não encontrado
        </h1>
        <p className="mt-3 text-muted">Verifique se o link está completo.</p>
        <Link href="/" className="mt-8 inline-block font-semibold text-accent">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}

function Fluxo({ token }: { token: string }) {
  const [agendamento, setAgendamento] = useState<AgendamentoGerenciado | null>();
  const [modo, setModo] = useState<Modo>("ver");
  const [dia, setDia] = useState<string>();
  const [horario, setHorario] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api<AgendamentoGerenciado>(`/gestao/${token}`)
      .then((dados) => {
        setAgendamento(dados);
        setDia(diaLocal(dados.inicio, dados.negocio.fuso_horario));
      })
      .catch(() => setAgendamento(null));
  }, [token]);

  if (agendamento === undefined) {
    return (
      <div className="mx-auto max-w-lg px-5 pt-24">
        <Esqueleto className="h-8 w-48" />
        <Esqueleto className="mt-6 h-56 rounded-panel" />
      </div>
    );
  }

  if (agendamento === null) return <NaoEncontrado />;

  const { negocio } = agendamento;
  const cancelado = agendamento.status === "cancelado";
  const passou = new Date(agendamento.inicio) <= new Date();
  const travado = cancelado || passou;

  async function executar(acao: "cancelar" | "remarcar", json?: unknown) {
    setOcupado(true);
    setErro(undefined);
    try {
      const atualizado = await api<AgendamentoGerenciado>(`/gestao/${token}/${acao}`, {
        method: "POST",
        json,
      });
      setAgendamento(atualizado);
      setModo("ver");
      setHorario(undefined);
      notificar(acao === "cancelar" ? "Agendamento cancelado." : "Horário remarcado.");
    } catch (e) {
      setErro(textoDoErro(e));
      if (e instanceof ErroApi && e.status === 409) setHorario(undefined);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="min-h-dvh pb-24" style={estiloDaMarca(negocio.cor_marca)}>
      <div className="h-1.5 bg-accent" />
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-5">
        <Link
          href={`/${negocio.slug}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-fg"
        >
          <LogoMarca className="size-5" /> {negocio.nome}
        </Link>
        <AlternarTema />
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-12">
        <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">Seu agendamento</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
          {cancelado ? "Agendamento cancelado" : agendamento.servico.nome}
        </h1>

        <ResumoDoAgendamento agendamento={agendamento} cancelado={cancelado} />

        {erro && (
          <div className="mt-5">
            <Aviso>{erro}</Aviso>
          </div>
        )}

        {travado ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/${negocio.slug}`}
              className="inline-flex h-12 items-center justify-center rounded-control bg-accent px-6 font-semibold text-accent-fg"
            >
              Fazer um novo agendamento
            </Link>
            {passou && !cancelado && (
              <p className="self-center text-sm text-muted">Este agendamento já aconteceu.</p>
            )}
          </div>
        ) : modo === "ver" ? (
          <AcoesDoAgendamento agendamento={agendamento} aoEscolher={setModo} />
        ) : modo === "cancelar" ? (
          <ConfirmarCancelamento
            ocupado={ocupado}
            aoConfirmar={() => executar("cancelar")}
            aoVoltar={() => setModo("ver")}
          />
        ) : (
          <EscolherNovoHorario
            agendamento={agendamento}
            dia={dia}
            horario={horario}
            ocupado={ocupado}
            aoMudarDia={(d) => {
              setDia(d);
              setHorario(undefined);
            }}
            aoMudarHorario={setHorario}
            aoConfirmar={() => executar("remarcar", { inicio: horario })}
            aoVoltar={() => setModo("ver")}
          />
        )}
      </main>
    </div>
  );
}

function ResumoDoAgendamento({
  agendamento,
  cancelado,
}: {
  agendamento: AgendamentoGerenciado;
  cancelado: boolean;
}) {
  const fuso = agendamento.negocio.fuso_horario;
  return (
    <div
      className={`mt-8 rounded-panel border border-line bg-raised p-6 shadow-2 ${cancelado ? "opacity-60" : ""}`}
    >
      <dl className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <dt className="text-xs text-faint">Data</dt>
          <dd
            className={`mt-1 text-lg font-medium first-letter:uppercase ${cancelado ? "line-through" : ""}`}
          >
            {dataLonga(agendamento.inicio, fuso)}
          </dd>
        </div>
        {[
          ["Início", hora(agendamento.inicio, fuso)],
          ["Fim", hora(agendamento.fim, fuso)],
          ["Valor", preco(agendamento.servico.preco_centavos)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-xs text-faint">{rotulo}</dt>
            <dd className="mt-1 font-mono text-xl font-semibold tabular">{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
        Cliente: <span className="font-medium text-fg">{agendamento.nome_cliente}</span>
        {agendamento.telefone_cliente && ` · ${exibirTelefone(agendamento.telefone_cliente)}`}
      </p>
    </div>
  );
}

const LINK_DE_AGENDA =
  "inline-flex h-12 items-center justify-center gap-2 rounded-control border border-line-strong px-4 text-sm font-medium whitespace-nowrap transition-colors hover:border-fg/30 hover:bg-surface";

function AcoesDoAgendamento({
  agendamento,
  aoEscolher,
}: {
  agendamento: AgendamentoGerenciado;
  aoEscolher: (modo: Modo) => void;
}) {
  const nome = agendamento.negocio.nome;
  return (
    <div className="mt-8 grid grid-cols-2 gap-3">
      <Botao variante="destaque" className="h-12" onClick={() => aoEscolher("remarcar")}>
        <Repeat className="size-4" /> Remarcar
      </Botao>
      <Botao variante="perigo" className="h-12" onClick={() => aoEscolher("cancelar")}>
        <CalendarX2 className="size-4" /> Cancelar
      </Botao>
      <a
        href={urlGoogleAgenda(agendamento, nome)}
        target="_blank"
        rel="noreferrer"
        className={LINK_DE_AGENDA}
      >
        <CalendarPlus className="size-4" /> Google Agenda
      </a>
      <a
        href={urlOutlook(agendamento, nome)}
        target="_blank"
        rel="noreferrer"
        className={LINK_DE_AGENDA}
      >
        <CalendarPlus className="size-4" /> Outlook
      </a>
    </div>
  );
}

function ConfirmarCancelamento({
  ocupado,
  aoConfirmar,
  aoVoltar,
}: {
  ocupado: boolean;
  aoConfirmar: () => void;
  aoVoltar: () => void;
}) {
  return (
    <div className="mt-8 rounded-panel bg-danger-soft p-5">
      <p className="font-semibold text-danger">Cancelar o agendamento?</p>
      <p className="mt-1 text-sm text-muted">O horário será liberado para outros clientes.</p>
      <div className="mt-4 flex gap-2">
        <Botao className="bg-danger! text-white!" carregando={ocupado} onClick={aoConfirmar}>
          Sim, cancelar
        </Botao>
        <Botao variante="fantasma" onClick={aoVoltar}>
          Voltar
        </Botao>
      </div>
    </div>
  );
}

function EscolherNovoHorario({
  agendamento,
  dia,
  horario,
  ocupado,
  aoMudarDia,
  aoMudarHorario,
  aoConfirmar,
  aoVoltar,
}: {
  agendamento: AgendamentoGerenciado;
  dia?: string;
  horario?: string;
  ocupado: boolean;
  aoMudarDia: (dia: string) => void;
  aoMudarHorario: (horario: string) => void;
  aoConfirmar: () => void;
  aoVoltar: () => void;
}) {
  const { slug, fuso_horario: fuso } = agendamento.negocio;
  const servicoIds = [agendamento.servico.id];
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">Escolha o novo horário</h2>
      {dia && (
        <>
          <FaixaDeDias
            slug={slug}
            servicoIds={servicoIds}
            fuso={fuso}
            valor={dia}
            aoMudar={aoMudarDia}
          />
          <GradeDeHorarios
            slug={slug}
            servicoIds={servicoIds}
            dia={dia}
            fuso={fuso}
            valor={horario}
            aoMudar={aoMudarHorario}
          />
        </>
      )}
      <div className="mt-8 flex gap-2">
        <Botao
          variante="destaque"
          tamanho="grande"
          disabled={!horario}
          carregando={ocupado}
          onClick={aoConfirmar}
        >
          Confirmar {horario ? hora(horario, fuso) : "novo horário"}
        </Botao>
        <Botao variante="fantasma" tamanho="grande" onClick={aoVoltar}>
          Voltar
        </Botao>
      </div>
    </section>
  );
}
