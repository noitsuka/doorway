"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Ban,
  CalendarSync,
  Check,
  Copy,
  ExternalLink,
  ImageUp,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { AvatarNegocio } from "@/components/avatar-negocio";
import { notificar } from "@/components/notificacao";
import { Aviso, Botao, Campo, Cartao } from "@/components/ui";
import { api, ErroApi, textoDoErro, URL_API } from "@/lib/api";
import { EMAIL_DEMO } from "@/lib/demo";
import { logoQuadrada } from "@/lib/imagem";
import { estiloDaMarca } from "@/lib/marca";
import type { Bloqueio, Negocio } from "@/lib/tipos";
import { exibirTelefone } from "@/lib/validacao";
import { useAtualizarSessao, useSessao } from "../sessao";

const PALETA = [
  "#2e4cf6",
  "#b4532a",
  "#c2417a",
  "#e5482d",
  "#7c3aed",
  "#0e7c66",
  "#3f6212",
  "#111214",
];

export function PaginaDaMarca() {
  const usuario = useSessao();
  const atualizar = useAtualizarSessao();
  const [nome, setNome] = useState(usuario.negocio.nome);
  const [categoria, setCategoria] = useState(usuario.negocio.categoria ?? "");
  const [chamada, setChamada] = useState(usuario.negocio.chamada ?? "");
  const [cor, setCor] = useState(usuario.negocio.cor_marca);
  const [campos, setCampos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(undefined);
    setCampos({});
    try {
      const negocio = await api<Negocio>("/negocio", {
        method: "PATCH",
        json: {
          nome,
          cor_marca: cor,
          categoria: categoria.trim() || null,
          chamada: chamada.trim() || null,
        },
      });
      atualizar({ ...usuario, negocio });
      notificar("Página atualizada. Os clientes já veem a nova versão.");
    } catch (e) {
      setErro(textoDoErro(e));
      if (e instanceof ErroApi) setCampos(e.campos);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.03em] sm:text-5xl">
            Página
          </h1>
          <p className="mt-2 text-muted">Como os clientes veem o seu negócio.</p>
        </div>
        <a
          href={`/${usuario.negocio.slug}`}
          target="_blank"
          className="inline-flex h-11 items-center gap-2 rounded-control border border-line-strong px-4 text-[15px] font-semibold hover:border-fg/40"
        >
          Abrir página <ExternalLink className="size-4" />
        </a>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <form onSubmit={salvar} className="space-y-6" noValidate>
          <Campo
            rotulo="Nome do negócio"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            erro={campos.nome}
            required
          />
          <Campo
            rotulo="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Barbearia, estúdio de beleza, clínica..."
            maxLength={40}
            erro={campos.categoria}
          />
          <Campo
            rotulo="Frase de apresentação"
            value={chamada}
            onChange={(e) => setChamada(e.target.value)}
            placeholder="O que faz o seu atendimento ser especial"
            maxLength={160}
            dica={`${chamada.length}/160`}
            erro={campos.chamada}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Cor da marca</legend>
            <div className="flex flex-wrap items-center gap-2">
              {PALETA.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Usar a cor ${c}`}
                  aria-pressed={cor.toLowerCase() === c}
                  onClick={() => setCor(c)}
                  className="grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-canvas transition-shadow aria-pressed:ring-2 aria-pressed:ring-fg"
                  style={{ background: c }}
                >
                  {cor.toLowerCase() === c && (
                    <Check className="size-4 text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
              <label className="ml-1 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line-strong pr-3 pl-1 text-sm">
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="size-8 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Escolher outra cor"
                />
                <span className="font-mono">{cor.toLowerCase()}</span>
              </label>
            </div>
            {campos.cor_marca && (
              <p className="mt-1.5 text-[13px] text-danger">{campos.cor_marca}</p>
            )}
          </fieldset>

          <SeletorDeLogo />

          {erro && !Object.keys(campos).length && <Aviso>{erro}</Aviso>}
          <Botao type="submit" variante="destaque" tamanho="grande" carregando={salvando}>
            Salvar alterações
          </Botao>
        </form>

        <aside aria-label="Prévia" className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-3 font-mono text-xs tracking-[0.16em] text-faint uppercase">Prévia</p>
          <div
            style={estiloDaMarca(cor)}
            className="overflow-hidden rounded-panel border border-line bg-raised shadow-2"
          >
            <div className="h-1.5 bg-accent" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <AvatarNegocio
                  slug={usuario.negocio.slug}
                  versaoLogo={usuario.negocio.versao_logo}
                />
                <div className="min-w-0">
                  {categoria && (
                    <p className="truncate text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
                      {categoria}
                    </p>
                  )}
                  <p className="truncate font-display text-xl font-medium">
                    {nome || "Seu negócio"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted">
                {chamada || "Escolha o serviço e o melhor horário para você."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["09:00", "09:30", "10:00"].map((h, i) => (
                  <span
                    key={h}
                    className={`grid h-10 place-items-center rounded-control border font-mono text-sm ${
                      i === 1 ? "border-accent bg-accent text-accent-fg" : "border-line"
                    }`}
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <AgendaNoCelular />
          <ClientesBloqueados />
        </aside>
      </div>
    </>
  );
}

function SeletorDeLogo() {
  const usuario = useSessao();
  const atualizar = useAtualizarSessao();
  const entrada = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string>();
  const { negocio } = usuario;
  const demo = usuario.email === EMAIL_DEMO;

  async function enviar(requisicao: () => Promise<Negocio>, concluido: string) {
    setOcupado(true);
    setErro(undefined);
    try {
      atualizar({ ...usuario, negocio: await requisicao() });
      notificar(concluido);
    } catch (e) {
      setErro(textoDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function escolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!arquivo) return;
    let imagem: Blob;
    try {
      imagem = await logoQuadrada(arquivo);
    } catch {
      setErro("Não foi possível ler essa imagem. Tente um JPG ou PNG.");
      return;
    }
    await enviar(
      () =>
        api<Negocio>("/negocio/logo", {
          method: "PUT",
          body: imagem,
          headers: { "Content-Type": imagem.type },
        }),
      "Foto atualizada.",
    );
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Foto ou logo</legend>
      <div className="flex flex-wrap items-center gap-4">
        <AvatarNegocio
          slug={negocio.slug}
          versaoLogo={negocio.versao_logo}
          className="size-16 rounded-panel text-xl"
        />
        <div className={`flex flex-wrap gap-2 ${demo ? "hidden" : ""}`}>
          <Botao
            type="button"
            variante="contorno"
            carregando={ocupado}
            onClick={() => entrada.current?.click()}
          >
            <ImageUp className="size-4" />
            {negocio.versao_logo ? "Trocar foto" : "Enviar foto"}
          </Botao>
          {negocio.versao_logo && (
            <Botao
              type="button"
              variante="fantasma"
              disabled={ocupado}
              onClick={() =>
                enviar(() => api<Negocio>("/negocio/logo", { method: "DELETE" }), "Foto removida.")
              }
            >
              <Trash2 className="size-4" /> Remover
            </Botao>
          )}
        </div>
        <input
          ref={entrada}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={escolher}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {demo
          ? "Na conta de demonstração a foto fica fixa, porque esta página é pública."
          : "Aparece no topo da sua página. A imagem é cortada em quadrado e reduzida antes do envio."}
      </p>
      {erro && <p className="mt-1.5 text-[13px] text-danger">{erro}</p>}
    </fieldset>
  );
}

function AgendaNoCelular() {
  const usuario = useSessao();
  const atualizar = useAtualizarSessao();
  const [trocando, setTrocando] = useState(false);
  const url = `${URL_API}/agenda/${usuario.negocio.token_agenda}.ics`;
  const webcal = url.replace(/^https?:/, "webcal:");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      notificar("Link copiado.");
    } catch {
      notificar("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  async function trocarLink() {
    setTrocando(true);
    try {
      const negocio = await api<Negocio>("/negocio/token-agenda", { method: "POST" });
      atualizar({ ...usuario, negocio });
      notificar("Link novo gerado. O antigo parou de funcionar.");
    } catch (e) {
      notificar(textoDoErro(e));
    } finally {
      setTrocando(false);
    }
  }

  return (
    <Cartao className="mt-6 p-5 shadow-none">
      <div className="flex items-center gap-2 font-semibold">
        <CalendarSync className="size-4 text-muted" /> Agenda no celular
      </div>
      <p className="mt-2 text-sm text-muted">
        Copie o link e adicione como assinatura no Google Agenda, no iPhone ou no Outlook. Os
        agendamentos aparecem junto com os seus compromissos e se atualizam sozinhos.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Botao type="button" variante="contorno" tamanho="pequeno" onClick={copiar}>
          <Copy className="size-3.5" /> Copiar link
        </Botao>
        <a
          href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line-strong bg-raised px-3 text-[13px] font-medium transition-colors hover:border-fg/30 hover:bg-surface"
        >
          Google Agenda <ExternalLink className="size-3.5" />
        </a>
      </div>
      <button
        type="button"
        onClick={trocarLink}
        disabled={trocando}
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline disabled:opacity-50"
      >
        <RefreshCw className={`size-3.5 ${trocando ? "animate-spin" : ""}`} />
        Gerar novo link (o atual deixa de funcionar)
      </button>
    </Cartao>
  );
}

function ClientesBloqueados() {
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>();

  useEffect(() => {
    api<Bloqueio[]>("/bloqueios")
      .then(setBloqueios)
      .catch(() => setBloqueios([]));
  }, []);

  async function desbloquear(bloqueio: Bloqueio) {
    try {
      await api(`/bloqueios/${bloqueio.id}`, { method: "DELETE" });
      setBloqueios((lista) => lista?.filter((b) => b.id !== bloqueio.id));
      notificar("Cliente desbloqueado.");
    } catch (e) {
      notificar(textoDoErro(e), "erro");
    }
  }

  return (
    <Cartao className="mt-6 p-5 shadow-none">
      <div className="flex items-center gap-2 font-semibold">
        <Ban className="size-4 text-muted" /> Clientes bloqueados
      </div>
      {!bloqueios ? null : bloqueios.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nenhum cliente bloqueado. Para bloquear, abra um agendamento na agenda e escolha Bloquear
          cliente.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {bloqueios.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">
                  {b.telefone ? exibirTelefone(b.telefone) : b.email}
                </p>
                {b.telefone && b.email && <p className="truncate text-xs text-muted">{b.email}</p>}
              </div>
              <Botao tamanho="pequeno" variante="fantasma" onClick={() => desbloquear(b)}>
                Desbloquear
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
