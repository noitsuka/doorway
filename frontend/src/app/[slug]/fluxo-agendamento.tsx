"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { AvatarNegocio } from "@/components/avatar-negocio";
import { LogoMarca } from "@/components/logo";
import { Acompanhantes, errosDosAcompanhantes } from "@/components/reserva/acompanhantes";
import { BuscaPorFrase } from "@/components/reserva/busca-por-frase";
import { Confirmacao } from "@/components/reserva/confirmacao";
import {
  EsqueletoDaPagina,
  Indisponivel,
  NaoEncontrado,
} from "@/components/reserva/estados-pagina";
import { EtapaDados } from "@/components/reserva/etapa-dados";
import { IndicadorEtapas } from "@/components/reserva/indicador-etapas";
import { ResumoReserva } from "@/components/reserva/resumo-reserva";
import { FaixaDeDias, GradeDeHorarios } from "@/components/reserva/seletor-horario";
import { SeletorServico } from "@/components/reserva/seletor-servico";
import { AlternarTema } from "@/components/tema";
import { Aviso, Botao } from "@/components/ui";
import { api, ErroApi } from "@/lib/api";
import { diaDoMes, diaLocal, diaSemanaCurto, hojeEm, hora, preco } from "@/lib/formatacao";
import { estiloDaMarca } from "@/lib/marca";
import type { Acompanhante, AgendamentoReservado, NegocioPublico, Servico } from "@/lib/tipos";

type Etapa = "escolha" | "dados" | "concluida";
type Pessoa = { nome: string; servico: Servico };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function FluxoAgendamento({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return SLUG.test(slug) ? <Fluxo slug={slug} /> : <NaoEncontrado />;
}

type Carregado = {
  negocio: NegocioPublico;
  inicial: { servico?: Servico; dia: string; horario?: string };
  chave: string;
};

function Fluxo({ slug }: { slug: string }) {
  const parametros = useSearchParams();
  const [carregado, setCarregado] = useState<Carregado | null>();
  const [indisponivel, setIndisponivel] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    api<NegocioPublico>(`/publico/${slug}`)
      .then((dados) => {
        if (!ativo) return;
        const hoje = hojeEm(dados.fuso_horario);
        const pedido = dados.servicos.find((s) => String(s.id) === parametros.get("servico"));
        const diaPedido = parametros.get("dia");
        setCarregado({
          negocio: dados,
          inicial: {
            servico: pedido ?? (dados.servicos.length === 1 ? dados.servicos[0] : undefined),
            dia: diaPedido && diaPedido >= hoje ? diaPedido : hoje,
            horario: (pedido && parametros.get("horario")) || undefined,
          },
          chave: parametros.toString(),
        });
      })
      .catch((e) => {
        if (!ativo) return;
        if (e instanceof ErroApi && (e.status === 404 || e.status === 422)) setCarregado(null);
        else setIndisponivel(true);
      });
    return () => {
      ativo = false;
    };
  }, [slug, parametros, tentativa]);

  if (indisponivel) {
    return (
      <Indisponivel
        aoTentarDeNovo={() => {
          setIndisponivel(false);
          setTentativa((t) => t + 1);
        }}
      />
    );
  }
  if (carregado === undefined) return <EsqueletoDaPagina />;
  if (carregado === null) return <NaoEncontrado />;
  return (
    <Reserva
      key={carregado.chave}
      slug={slug}
      negocio={carregado.negocio}
      inicial={carregado.inicial}
    />
  );
}

function Reserva({
  slug,
  negocio,
  inicial,
}: {
  slug: string;
  negocio: NegocioPublico;
  inicial: Carregado["inicial"];
}) {
  const [servico, setServico] = useState(inicial.servico);
  const [dia, setDia] = useState(inicial.dia);
  const [horario, setHorario] = useState(inicial.horario);
  const [etapa, setEtapa] = useState<Etapa>("escolha");
  const [aviso, setAviso] = useState<string>();
  const [horarioPerdido, setHorarioPerdido] = useState<string>();
  const [recarga, setRecarga] = useState(0);
  const [agendamentos, setAgendamentos] = useState<AgendamentoReservado[]>();
  const [acompanhantes, setAcompanhantes] = useState<Acompanhante[]>([]);
  const [validarAcompanhantes, setValidarAcompanhantes] = useState(false);

  const aoSumir = useCallback(() => {
    setHorarioPerdido(horario);
    setHorario(undefined);
    setAviso("O horário selecionado não está mais disponível. Escolha outro.");
  }, [horario]);

  const fuso = negocio.fuso_horario;
  const pronto = Boolean(servico && horario);
  const indiceEtapa = etapa === "dados" ? 2 : servico ? 1 : 0;
  const servicoIds = servico ? [servico.id, ...acompanhantes.map((a) => a.servico.id)] : [];
  const pessoas = servico ? [{ nome: "Você", servico }, ...acompanhantes] : [];
  const errosAcompanhantes = validarAcompanhantes ? errosDosAcompanhantes(acompanhantes) : {};

  function escolherHorario(novo: string | undefined) {
    setHorario(novo);
    setHorarioPerdido(undefined);
    setAviso(undefined);
  }

  function mudarAcompanhantes(novos: Acompanhante[]) {
    const mudouDuracao =
      novos.reduce((s, a) => s + a.servico.duracao_minutos, 0) !==
      acompanhantes.reduce((s, a) => s + a.servico.duracao_minutos, 0);
    setAcompanhantes(novos);
    if (mudouDuracao) {
      setHorario(undefined);
      setHorarioPerdido(undefined);
    }
  }

  function avancar() {
    if (Object.keys(errosDosAcompanhantes(acompanhantes)).length) {
      setValidarAcompanhantes(true);
      requestAnimationFrame(() =>
        document.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setEtapa("dados");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-dvh pb-36 lg:pb-20" style={estiloDaMarca(negocio.cor_marca)}>
      <CabecalhoDoNegocio negocio={negocio} />

      {etapa !== "concluida" && <IndicadorEtapas atual={indiceEtapa} />}

      <main className="mx-auto grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[1fr_22rem] lg:gap-10">
        <AnimatePresence mode="wait">
          {etapa === "concluida" && agendamentos ? (
            <motion.div
              key="concluida"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2"
            >
              <Confirmacao agendamentos={agendamentos} negocio={negocio} />
            </motion.div>
          ) : (
            <motion.div
              key={etapa}
              initial={{ opacity: 0, x: etapa === "dados" ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="min-w-0 space-y-12"
            >
              {etapa === "escolha" ? (
                <>
                  <SeletorServico
                    servicos={negocio.servicos}
                    valor={servico}
                    aoMudar={(s) => {
                      setServico(s);
                      setHorario(undefined);
                      setHorarioPerdido(undefined);
                    }}
                  />
                  {servico && negocio.servicos.length > 0 && (
                    <Acompanhantes
                      servicos={negocio.servicos}
                      servico={servico}
                      valor={acompanhantes}
                      aoMudar={mudarAcompanhantes}
                      erros={errosAcompanhantes}
                    />
                  )}
                  {servico && dia && (
                    <DataEHorario
                      slug={slug}
                      servicoIds={servicoIds}
                      fuso={fuso}
                      dia={dia}
                      horario={horario}
                      horarioPerdido={horarioPerdido}
                      aviso={aviso}
                      recarga={recarga}
                      aoSumir={aoSumir}
                      aoMudarDia={(d) => {
                        setDia(d);
                        escolherHorario(undefined);
                      }}
                      aoEscolherPelaFrase={(h) => {
                        setDia(diaLocal(h, fuso));
                        escolherHorario(h);
                      }}
                      aoMudarHorario={escolherHorario}
                    />
                  )}
                </>
              ) : (
                <EtapaDados
                  slug={slug}
                  tokenFormulario={negocio.token_formulario}
                  fuso={fuso}
                  servico={servico!}
                  acompanhantes={acompanhantes}
                  horario={horario!}
                  aoVoltar={() => setEtapa("escolha")}
                  aoPerderHorario={() => {
                    setAviso("Este horário foi reservado por outra pessoa. Escolha outro.");
                    setHorarioPerdido(horario);
                    setHorario(undefined);
                    setRecarga((r) => r + 1);
                    setEtapa("escolha");
                  }}
                  aoReservar={(lista) => {
                    setAgendamentos(lista);
                    setEtapa("concluida");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {etapa !== "concluida" && (
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <ResumoReserva pessoas={pessoas} horario={horario} fuso={fuso} />
              {etapa === "escolha" && (
                <Botao
                  variante="destaque"
                  tamanho="grande"
                  className="mt-4 w-full"
                  disabled={!pronto}
                  onClick={avancar}
                >
                  Continuar <ArrowRight className="size-4" />
                </Botao>
              )}
            </div>
          </aside>
        )}

        {etapa === "escolha" && (
          <BarraDoCelular
            pessoas={pessoas}
            temAcompanhantes={acompanhantes.length > 0}
            horario={pronto ? horario : undefined}
            fuso={fuso}
            aoAvancar={avancar}
          />
        )}
      </main>
    </div>
  );
}

function CabecalhoDoNegocio({ negocio }: { negocio: NegocioPublico }) {
  return (
    <>
      <div className="h-1.5 bg-accent" />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-5 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <LogoMarca className="size-5" /> Doorway
        </Link>
        <AlternarTema />
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-8 sm:px-8 sm:pt-12">
        <div className="flex animate-enter items-start gap-5">
          <AvatarNegocio
            slug={negocio.slug}
            versaoLogo={negocio.versao_logo}
            className="size-16 rounded-panel text-2xl sm:size-20 sm:text-3xl"
          />
          <div className="min-w-0 pt-1">
            {negocio.categoria && (
              <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase dark:text-[color-mix(in_oklab,var(--accent)_65%,white)]">
                {negocio.categoria}
              </p>
            )}
            <h1 className="mt-1 font-display text-4xl leading-[1.05] font-medium tracking-[-0.03em] sm:text-5xl">
              {negocio.nome}
            </h1>
            <p className="mt-2 max-w-xl text-muted">{negocio.chamada ?? "Agendamento online."}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function DataEHorario({
  slug,
  servicoIds,
  fuso,
  dia,
  horario,
  horarioPerdido,
  aviso,
  recarga,
  aoSumir,
  aoMudarDia,
  aoEscolherPelaFrase,
  aoMudarHorario,
}: {
  slug: string;
  servicoIds: number[];
  fuso: string;
  dia: string;
  horario?: string;
  horarioPerdido?: string;
  aviso?: string;
  recarga: number;
  aoSumir: () => void;
  aoMudarDia: (dia: string) => void;
  aoEscolherPelaFrase: (horario: string) => void;
  aoMudarHorario: (horario: string) => void;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">Data e horário</h2>
      <BuscaPorFrase
        key={servicoIds.join(",")}
        slug={slug}
        servicoIds={servicoIds}
        fuso={fuso}
        valor={horario}
        aoEscolher={aoEscolherPelaFrase}
      />
      <FaixaDeDias
        slug={slug}
        servicoIds={servicoIds}
        fuso={fuso}
        valor={dia}
        aoMudar={aoMudarDia}
      />
      {aviso && (
        <div className="mt-5">
          <Aviso>{aviso}</Aviso>
        </div>
      )}
      <GradeDeHorarios
        key={recarga}
        slug={slug}
        servicoIds={servicoIds}
        dia={dia}
        fuso={fuso}
        valor={horario}
        sugerirApos={horarioPerdido}
        aoSumir={aoSumir}
        aoMudar={aoMudarHorario}
      />
    </section>
  );
}

function BarraDoCelular({
  pessoas,
  temAcompanhantes,
  horario,
  fuso,
  aoAvancar,
}: {
  pessoas: Pessoa[];
  temAcompanhantes: boolean;
  horario?: string;
  fuso: string;
  aoAvancar: () => void;
}) {
  const total = pessoas.reduce((soma, p) => soma + p.servico.preco_centavos, 0);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 px-5 pt-3 pb-safe backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="min-w-0 flex-1 text-sm">
          {horario ? (
            <>
              <p className="truncate font-semibold">
                {temAcompanhantes ? `${pessoas.length} pessoas` : pessoas[0].servico.nome}
              </p>
              <p className="truncate text-muted first-letter:uppercase">
                {diaSemanaCurto(diaLocal(horario, fuso))} {diaDoMes(diaLocal(horario, fuso))} ·{" "}
                <span className="font-mono">{hora(horario, fuso)}</span> · {preco(total)}
              </p>
            </>
          ) : (
            <p className="text-muted">
              {pessoas.length ? "Escolha um horário" : "Escolha um serviço"}
            </p>
          )}
        </div>
        <Botao variante="destaque" disabled={!horario} onClick={aoAvancar}>
          Continuar
        </Botao>
      </div>
    </div>
  );
}
