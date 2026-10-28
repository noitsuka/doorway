import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { BotaoDemo } from "@/components/botao-demo";
import { PaginaInstitucional } from "@/components/inicio/pagina-institucional";
import { IconeGitHub } from "@/components/redes";
import { Surgir } from "@/components/surgir";
import { TesteCorrida } from "@/components/teste-corrida";
import { URL_GITHUB } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Como foi feito",
  description:
    "Estudo de caso do Doorway: arquitetura, decisões de concorrência, desempenho e testes.",
};

const tecnologias = [
  ["Frontend", "Next.js 16, React 19, TypeScript, Tailwind CSS 4, Motion, GSAP"],
  ["Backend", "Python 3.14, FastAPI, SQLAlchemy 2 assíncrono, asyncpg, Pydantic, Alembic"],
  ["Banco", "PostgreSQL 17 com restrição de exclusão (btree_gist) e migrações versionadas"],
  ["Qualidade", "pytest, Hypothesis, teste de caos, Ruff, ESLint, Prettier, GitHub Actions"],
  ["Execução", "Docker, Gunicorn com workers Uvicorn, Vercel"],
];

const decisoes = [
  {
    etiqueta: "Concorrência",
    titulo: "Reservas simultâneas",
    problema:
      "Se dois clientes escolhem o mesmo horário ao mesmo tempo, conferir a disponibilidade e só depois gravar deixa espaço para as duas reservas passarem.",
    solucao:
      "Cada reserva trava a linha do negócio com SELECT ... FOR UPDATE, confere o horário e grava na mesma transação. Além disso, uma restrição de exclusão no PostgreSQL impede intervalos sobrepostos, mesmo que algum caminho do código esqueça a trava.",
    detalhe:
      "Os testes de concorrência mostraram um deadlock entre inserções sobrepostas antes da trava existir. Com ela, o teste passa em 30 execuções seguidas.",
  },
  {
    etiqueta: "Disponibilidade",
    titulo: "Horários calculados a cada consulta",
    problema:
      "Guardar os horários vagos numa tabela exigiria recalcular tudo sempre que o expediente ou a duração de um serviço mudasse.",
    solucao:
      "Calculo os horários na hora: converto o expediente do dia para UTC e percorro os intervalos ocupados uma única vez.",
    detalhe:
      "Um teste com Hypothesis compara o resultado com uma versão de força bruta em agendas aleatórias, e outro cobre a mudança de horário de verão.",
  },
  {
    etiqueta: "Busca",
    titulo: "Busca por frase",
    problema:
      "No celular, passar de dia em dia procurando um horário é o passo mais demorado da reserva.",
    solucao:
      'O cliente pode digitar algo como "sexta à tarde" ou "amanhã depois das 18h". Um interpretador por regras transforma a frase em dias e faixa de horário, e os horários vêm do mesmo cálculo da grade. As sugestões abaixo do campo são montadas a partir dos horários disponíveis.',
    detalhe:
      "Optei por regras em vez de um modelo de linguagem para ter respostas previsíveis e sem custo por requisição. A função é testada com casos fixos e com textos aleatórios.",
  },
  {
    etiqueta: "Relatório",
    titulo: "Demanda perdida",
    problema:
      "O sistema só sabia de quem conseguiu reservar. Não havia registro de quem procurou um horário e não encontrou.",
    solucao:
      "Dias sem horário livre e buscas sem resultado passaram a ser registrados, separando o que caiu fora do expediente do que esbarrou na agenda cheia. O painel mostra isso por dia e hora e sugere qual horário valeria abrir.",
    detalhe:
      "O visitante é identificado por um HMAC do IP com a data, que muda todo dia. Uma restrição única evita contar várias vezes a mesma pessoa atualizando a página.",
  },
  {
    etiqueta: "Concorrência",
    titulo: "Reserva para várias pessoas",
    problema:
      "Fazer uma reserva por pessoa permite que a primeira entre e a segunda perca o horário para outro cliente.",
    solucao:
      "Trato o grupo como um bloco único, com a soma das durações, validado sob a mesma trava e gravado numa só transação. Cada pessoa recebe o próprio link para remarcar ou cancelar.",
    detalhe:
      "Um teste envia um grupo e uma reserva simples ao mesmo tempo, disputando um horário no meio do bloco, e confere que só uma delas é aceita.",
  },
  {
    etiqueta: "Segurança",
    titulo: "Reservas falsas",
    problema:
      "Como a reserva não exige conta, nada impedia um robô ou uma pessoa de ocupar horários com dados inventados.",
    solucao:
      "A página entrega um token assinado com o horário em que foi carregada, e a reserva só é aceita depois de alguns segundos. Há também um campo escondido para robôs, recusa de e-mails temporários, limite de reservas futuras por conexão e uma lista de clientes bloqueados pelo dono.",
    detalhe:
      "Preferi não usar captcha para não acrescentar atrito ao passo que precisa ser mais rápido.",
  },
  {
    etiqueta: "Desempenho",
    titulo: "Conexões com o banco",
    problema:
      "A consulta de horários fazia seis idas ao banco e, sob carga, algumas requisições esperavam mais de cinco segundos por uma conexão.",
    solucao:
      "Juntei as leituras públicas em uma consulta em autocommit, coloquei uma fila na frente do pool de conexões e configurei o Gunicorn para distribuir as conexões entre os workers.",
    detalhe: "O script de carga está em backend/scripts/teste_carga.py.",
  },
  {
    etiqueta: "Segurança",
    titulo: "Entradas inválidas",
    problema:
      "Uma rota pública recebe de tudo: caracteres nulos, números enormes, corpos grandes e rajadas de pedidos.",
    solucao:
      "Toda entrada tem limite de tamanho e formato, os erros de validação não repetem o valor enviado, o corpo é limitado a 64 KB e login, cadastro e reservas têm limite de tentativas guardado no banco.",
    detalhe:
      "Testes de fuzzing e um teste com 60 clientes simultâneos encontraram problemas reais, como um limite de tentativas que não funcionava com vários workers. Cada um virou um teste.",
  },
];

const limites = [
  "Um profissional por negócio. Agenda por profissional fica para uma próxima versão.",
  "Não há lembretes por e-mail.",
  "Os limites de tentativas ficam no PostgreSQL. Com mais volume, faria sentido usar Redis.",
  "A integração com o Google Agenda é só de ida, por link e arquivo .ics. A sincronização nos dois sentidos exige aprovação do Google.",
];

function Secao({
  sobretitulo,
  titulo,
  children,
}: {
  sobretitulo: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <Surgir className="lg:sticky lg:top-28 lg:self-start">
          <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">{sobretitulo}</p>
          <h2 className="mt-4 font-display text-4xl leading-[1.05] font-medium tracking-[-0.03em] sm:text-5xl">
            {titulo}
          </h2>
        </Surgir>
        <Surgir atraso={0.08}>{children}</Surgir>
      </div>
    </section>
  );
}

function Bloco({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div className="rounded-panel border border-line bg-raised px-5 py-4 shadow-1">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>
    </div>
  );
}

function Seta({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-6 text-xs text-faint">
      <span className="h-8 w-px bg-line-strong" />
      <span className="font-mono">{rotulo}</span>
    </div>
  );
}

export default function ComoFoiFeito() {
  return (
    <PaginaInstitucional>
      <main>
        <section className="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 lg:pt-24">
          <p className="animate-enter font-mono text-xs tracking-[0.16em] text-faint uppercase">
            Estudo de caso
          </p>
          <h1 className="mt-5 max-w-4xl animate-enter font-display text-5xl leading-[1] font-medium tracking-[-0.035em] [animation-delay:80ms] sm:text-7xl">
            Como o Doorway foi feito
          </h1>
          <p className="mt-7 max-w-2xl animate-enter text-lg leading-relaxed text-muted [animation-delay:160ms] sm:text-xl">
            O Doorway é um projeto de portfólio que fiz para estudar um sistema de agendamento de
            ponta a ponta. Abaixo estão a arquitetura, as principais decisões e o que ainda falta.
          </p>
          <div className="mt-9 flex animate-enter flex-col gap-3 [animation-delay:240ms] sm:flex-row">
            <a
              href={URL_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-control bg-fg px-7 font-semibold text-canvas transition-colors hover:bg-fg/85"
            >
              <IconeGitHub className="size-5" /> Ver o código
            </a>
            <BotaoDemo variante="contorno" tamanho="grande">
              Abrir painel demo <ArrowRight className="size-4" />
            </BotaoDemo>
          </div>
        </section>

        <Secao sobretitulo="Arquitetura" titulo="Como as partes se conectam">
          <div className="max-w-md">
            <Bloco titulo="Navegador" subtitulo="Página do cliente e painel do negócio" />
            <Seta rotulo="HTTPS" />
            <Bloco titulo="Next.js na Vercel" subtitulo="Interface, tema e cliente da API" />
            <Seta rotulo="REST / JSON" />
            <Bloco
              titulo="FastAPI com Gunicorn"
              subtitulo="Validação, regras de agenda, limites e erros em 503 com Retry-After"
            />
            <Seta rotulo="asyncpg" />
            <Bloco
              titulo="PostgreSQL"
              subtitulo="Trava por negócio e restrição de exclusão contra sobreposição"
            />
          </div>
          <dl className="mt-12 divide-y divide-line border-y border-line">
            {tecnologias.map(([rotulo, valor]) => (
              <div key={rotulo} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-mono text-xs tracking-[0.12em] text-faint uppercase sm:pt-1">
                  {rotulo}
                </dt>
                <dd className="text-[15px]">{valor}</dd>
              </div>
            ))}
          </dl>
        </Secao>

        <Secao sobretitulo="Teste ao vivo" titulo="Reservas simultâneas em produção">
          <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted">
            O botão abaixo envia 20 reservas ao mesmo tempo para o mesmo horário, no servidor de
            produção. Só uma é aceita e as outras recebem 409. As reservas de teste são apagadas
            logo depois.
          </p>
          <TesteCorrida />
        </Secao>

        <Secao sobretitulo="Decisões" titulo="Principais decisões técnicas">
          <div className="space-y-6">
            {decisoes.map((d) => (
              <article
                key={d.titulo}
                className="rounded-panel border border-line bg-raised p-6 sm:p-8"
              >
                <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
                  {d.etiqueta}
                </p>
                <h3 className="mt-3 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {d.titulo}
                </h3>
                <dl className="mt-5 space-y-4 text-[15px] leading-relaxed">
                  <div>
                    <dt className="font-semibold">O problema</dt>
                    <dd className="mt-1 text-muted">{d.problema}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">A solução</dt>
                    <dd className="mt-1 text-muted">{d.solucao}</dd>
                  </div>
                  <div className="rounded-control bg-fg/[0.04] p-4">
                    <dt className="sr-only">Detalhe</dt>
                    <dd className="text-muted">{d.detalhe}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Secao>

        <Secao sobretitulo="Limites" titulo="O que ainda não está pronto">
          <ul className="space-y-4">
            {limites.map((item) => (
              <li key={item} className="flex gap-4 text-[16px] leading-relaxed">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="text-muted">{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={URL_GITHUB}
            target="_blank"
            rel="noreferrer"
            className="mt-10 inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          >
            Mais detalhes no README <ArrowUpRight className="size-4" />
          </a>
        </Secao>
      </main>
    </PaginaInstitucional>
  );
}
