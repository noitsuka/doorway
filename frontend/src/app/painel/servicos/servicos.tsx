"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Archive, Clock3, Pencil, Plus, RotateCcw, DoorOpen } from "lucide-react";

import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { Gaveta } from "@/components/gaveta";
import { notificar } from "@/components/notificacao";
import { Aviso, Botao, Campo, Esqueleto } from "@/components/ui";
import { api, ErroApi, textoDoErro } from "@/lib/api";
import { dinheiro, duracao } from "@/lib/formatacao";
import type { Servico } from "@/lib/tipos";

type Edicao = Servico | "novo" | null;

const DURACOES = [15, 30, 45, 60, 90, 120];

export function PaginaDeServicos() {
  const [servicos, setServicos] = useState<Servico[]>();
  const [edicao, setEdicao] = useState<Edicao>(null);

  useEffect(() => {
    api<Servico[]>("/servicos")
      .then(setServicos)
      .catch((e) => notificar(textoDoErro(e), "erro"));
  }, []);

  function incluirOuAtualizar(servico: Servico) {
    setServicos((lista = []) =>
      lista.some((s) => s.id === servico.id)
        ? lista.map((s) => (s.id === servico.id ? servico : s))
        : [...lista, servico].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    );
  }

  async function definirAtivo(servico: Servico, ativo: boolean) {
    try {
      incluirOuAtualizar(
        await api<Servico>(`/servicos/${servico.id}`, { method: "PATCH", json: { ativo } }),
      );
      notificar(
        ativo ? `${servico.nome} voltou para a sua página.` : `${servico.nome} foi arquivado.`,
      );
    } catch (e) {
      notificar(textoDoErro(e), "erro");
    }
  }

  async function excluir(servico: Servico) {
    try {
      await api(`/servicos/${servico.id}`, { method: "DELETE" });
      setServicos((lista = []) => lista.filter((s) => s.id !== servico.id));
      notificar(`${servico.nome} foi excluído.`);
    } catch (e) {
      notificar(textoDoErro(e), "erro");
    }
  }

  const ativos = servicos?.filter((s) => s.ativo) ?? [];
  const arquivados = servicos?.filter((s) => !s.ativo) ?? [];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Serviços
          </h1>
          <p className="mt-2 text-muted">O que os seus clientes podem agendar.</p>
        </div>
        <Botao onClick={() => setEdicao("novo")}>
          <Plus className="size-4" /> Novo serviço
        </Botao>
      </div>

      <Suspense>
        <BoasVindas mostrar={servicos?.length === 0} aoComecar={() => setEdicao("novo")} />
      </Suspense>

      <div className="mt-8 space-y-3">
        {!servicos
          ? Array.from({ length: 3 }, (_, i) => (
              <Esqueleto key={i} className="h-[88px] rounded-panel" />
            ))
          : ativos.map((servico) => (
              <div
                key={servico.id}
                className="group grid animate-enter grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-panel border border-line bg-raised p-4 transition-colors hover:border-fg/20 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-4 sm:gap-y-0.5 sm:p-5"
              >
                <p className="truncate font-semibold sm:self-end">{servico.nome}</p>
                <p className="col-start-2 row-start-1 text-right font-mono text-lg font-semibold tabular sm:row-span-2">
                  {dinheiro(servico.preco_centavos)}
                </p>
                <p className="flex items-center gap-1.5 text-sm text-muted sm:col-start-1 sm:row-start-2 sm:self-start">
                  <Clock3 className="size-3.5" /> {duracao(servico.duracao_minutos)}
                </p>
                <div className="col-start-2 row-start-2 -mr-2 flex justify-end sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mr-0">
                  <BotaoIcone rotulo={`Editar ${servico.nome}`} onClick={() => setEdicao(servico)}>
                    <Pencil className="size-4" />
                  </BotaoIcone>
                  <BotaoIcone
                    rotulo={`Arquivar ${servico.nome}`}
                    onClick={() => definirAtivo(servico, false)}
                  >
                    <Archive className="size-4" />
                  </BotaoIcone>
                  <ConfirmarExclusao rotulo={servico.nome} aoConfirmar={() => excluir(servico)} />
                </div>
              </div>
            ))}
      </div>

      {arquivados.length > 0 && (
        <section className="mt-12">
          <p className="mb-3 font-mono text-xs tracking-[0.16em] text-faint uppercase">
            Arquivados
          </p>
          <div className="divide-y divide-line rounded-panel border border-line">
            {arquivados.map((servico) => (
              <div key={servico.id} className="flex items-center gap-4 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-muted line-through">
                  {servico.nome}
                </span>
                <Botao
                  tamanho="pequeno"
                  variante="fantasma"
                  onClick={() => definirAtivo(servico, true)}
                >
                  <RotateCcw className="size-3.5" /> Reativar
                </Botao>
                <ConfirmarExclusao rotulo={servico.nome} aoConfirmar={() => excluir(servico)} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Gaveta
        aberta={edicao !== null}
        titulo={edicao === "novo" ? "Novo serviço" : "Editar serviço"}
        aoFechar={() => setEdicao(null)}
      >
        {edicao !== null && (
          <FormularioServico
            key={edicao === "novo" ? "novo" : edicao.id}
            servico={edicao === "novo" ? undefined : edicao}
            aoSalvar={(servico, criado) => {
              incluirOuAtualizar(servico);
              setEdicao(null);
              notificar(
                criado ? `${servico.nome} já aparece na sua página.` : "Alterações salvas.",
              );
            }}
          />
        )}
      </Gaveta>
    </>
  );
}

function BoasVindas({ mostrar, aoComecar }: { mostrar: boolean; aoComecar: () => void }) {
  const boasVindas = useSearchParams().get("boas-vindas");
  if (!mostrar && !boasVindas) return null;
  return (
    <div className="mt-8 flex flex-col gap-4 rounded-panel bg-inverse p-6 text-on-inverse sm:flex-row sm:items-center">
      <DoorOpen className="size-6 shrink-0 text-on-inverse opacity-70" />
      <div className="flex-1">
        <p className="font-semibold">Sua página está no ar. Falta pouco.</p>
        <p className="mt-1 text-sm opacity-70">
          Cadastre pelo menos um serviço e defina seus horários para receber agendamentos.
        </p>
      </div>
      {mostrar && (
        <Botao variante="destaque" onClick={aoComecar}>
          Cadastrar serviço
        </Botao>
      )}
    </div>
  );
}

function centavosDoTexto(texto: string) {
  const digitos = texto.replace(/\D/g, "").slice(0, 9);
  return digitos ? Number(digitos) : null;
}

function FormularioServico({
  servico,
  aoSalvar,
}: {
  servico?: Servico;
  aoSalvar: (servico: Servico, criado: boolean) => void;
}) {
  const [nome, setNome] = useState(servico?.nome ?? "");
  const [minutos, setMinutos] = useState<number | null>(servico?.duracao_minutos ?? 30);
  const [outra, setOutra] = useState(
    servico && !DURACOES.includes(servico.duracao_minutos) ? String(servico.duracao_minutos) : "",
  );
  const [centavos, setCentavos] = useState<number | null>(servico?.preco_centavos ?? null);
  const [erro, setErro] = useState<string>();
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const avisos: Record<string, string> = {};
    if (minutos === null || minutos < 5 || minutos > 480) {
      avisos.duracao_minutos = "invalida";
    }
    if (centavos === null)
      avisos.preco_centavos = "Informe o preço. Use 0 para serviços gratuitos.";
    if (Object.keys(avisos).length) {
      setCampos(avisos);
      return;
    }
    setCarregando(true);
    setErro(undefined);
    setCampos({});
    try {
      const salvo = await api<Servico>(servico ? `/servicos/${servico.id}` : "/servicos", {
        method: servico ? "PATCH" : "POST",
        json: { nome, duracao_minutos: minutos, preco_centavos: centavos },
      });
      aoSalvar(salvo, !servico);
    } catch (e) {
      setErro(textoDoErro(e));
      if (e instanceof ErroApi) setCampos(e.campos);
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="space-y-6 pb-4" noValidate>
      <Campo
        rotulo="Nome do serviço"
        name="nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Corte masculino"
        maxLength={120}
        required
        erro={campos.nome}
      />

      <fieldset>
        <legend className="mb-2 block text-sm font-medium">Duração</legend>
        <div className="grid grid-cols-3 gap-2">
          {DURACOES.map((valor) => (
            <button
              key={valor}
              type="button"
              aria-pressed={!outra && minutos === valor}
              onClick={() => {
                setMinutos(valor);
                setOutra("");
              }}
              className={`h-11 rounded-control border font-mono text-sm font-medium transition-colors ${
                !outra && minutos === valor
                  ? "border-fg bg-fg text-canvas"
                  : "border-line-strong bg-raised hover:border-fg/40"
              }`}
            >
              {duracao(valor)}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm text-muted">
          Outra duração
          <span
            className={`flex h-10 w-28 items-center rounded-control border bg-raised transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 ${
              campos.duracao_minutos ? "border-danger" : "border-line-strong hover:border-fg/30"
            }`}
          >
            <input
              name="duracao"
              inputMode="numeric"
              autoComplete="off"
              placeholder="50"
              value={outra}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "").slice(0, 3);
                setOutra(digitos);
                setMinutos(digitos ? Number(digitos) : null);
              }}
              aria-invalid={campos.duracao_minutos ? true : undefined}
              className="h-full min-w-0 flex-1 bg-transparent pl-3 font-mono text-[15px] text-fg tabular focus:outline-none"
            />
            <span className="pr-3 text-faint">min</span>
          </span>
        </label>
        <p
          className={`mt-1.5 text-[13px] ${campos.duracao_minutos ? "text-danger" : "text-muted"}`}
        >
          {campos.duracao_minutos ? "Entre 5 minutos e 8 horas." : "Em minutos, de 5 a 480."}
        </p>
      </fieldset>

      <div>
        <label htmlFor="preco-servico" className="mb-2 block text-sm font-medium">
          Preço
        </label>
        <div
          className={`flex h-12 items-center overflow-hidden rounded-control border bg-raised transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 ${
            campos.preco_centavos ? "border-danger" : "border-line-strong hover:border-fg/30"
          }`}
        >
          <span className="pl-4 text-muted">R$</span>
          <input
            id="preco-servico"
            name="preco"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0,00"
            value={centavos === null ? "" : dinheiro(centavos).replace(/^R\$\s?/, "")}
            onChange={(e) => setCentavos(centavosDoTexto(e.target.value))}
            aria-invalid={campos.preco_centavos ? true : undefined}
            className="h-full min-w-0 flex-1 bg-transparent pr-4 pl-2 font-mono text-base tabular focus:outline-none"
          />
        </div>
        <p className={`mt-1.5 text-[13px] ${campos.preco_centavos ? "text-danger" : "text-muted"}`}>
          {campos.preco_centavos ?? "Digite só os números. Use 0 para serviços gratuitos."}
        </p>
      </div>

      <div className="rounded-control border border-dashed border-line-strong p-4">
        <p className="text-xs text-faint">Como aparece na sua página</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{nome.trim() || "Nome do serviço"}</p>
            <p className="text-sm text-muted">
              {minutos && minutos >= 5 ? duracao(minutos) : "Duração"}
            </p>
          </div>
          <p className="font-mono font-medium tabular">
            {centavos === null ? "-" : centavos === 0 ? "Grátis" : dinheiro(centavos)}
          </p>
        </div>
      </div>

      {erro && !Object.keys(campos).length && <Aviso>{erro}</Aviso>}
      <Botao
        type="submit"
        variante="destaque"
        tamanho="grande"
        carregando={carregando}
        className="w-full"
      >
        {servico ? "Salvar alterações" : "Adicionar serviço"}
      </Botao>
    </form>
  );
}

function BotaoIcone({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-control text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
    >
      {children}
    </button>
  );
}
