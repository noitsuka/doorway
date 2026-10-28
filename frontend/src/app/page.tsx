import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BotaoDemo } from "@/components/botao-demo";
import { PaginaInstitucional } from "@/components/inicio/pagina-institucional";
import { CartoesExemplos } from "@/components/inicio/cartoes-exemplos";
import { Engenharia } from "@/components/inicio/engenharia";
import { ComoFunciona } from "@/components/inicio/como-funciona";
import { DemoProduto } from "@/components/inicio/demo-produto";
import { Mosaico } from "@/components/inicio/mosaico";
import { Perguntas } from "@/components/inicio/perguntas";
import { Trelica } from "@/components/inicio/trelica";
import { Surgir } from "@/components/surgir";
import { LinkBotao } from "@/components/ui";
import { URL_GITHUB } from "@/lib/demo";

function Secao({
  id,
  sobretitulo,
  titulo,
  texto,
  children,
}: {
  id?: string;
  sobretitulo: string;
  titulo: string;
  texto?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 lg:py-32">
      <Surgir className="max-w-2xl">
        <p className="text-sm font-medium text-muted">{sobretitulo}</p>
        <h2 className="mt-3 text-3xl leading-[1.11] font-medium tracking-[-0.02em] sm:text-4xl">
          {titulo}
        </h2>
        {texto && <p className="mt-4 text-[17px] leading-relaxed text-muted">{texto}</p>}
      </Surgir>
      <Surgir atraso={0.08} className="mt-10 lg:mt-12">
        {children}
      </Surgir>
    </section>
  );
}

export default function Inicio() {
  return (
    <PaginaInstitucional>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-14 pb-10 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-24 lg:pb-16">
          <div className="min-w-0">
            <a
              href={URL_GITHUB}
              target="_blank"
              rel="noreferrer"
              className="group mb-6 inline-flex animate-rise items-center gap-2 rounded-full border border-line bg-raised py-1 pr-3 pl-1 text-[13px] text-muted transition-colors hover:border-fg/25 hover:text-fg"
            >
              <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-semibold text-canvas">
                Portfólio
              </span>
              Projeto de código aberto
              <ArrowRight className="size-3.5 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5" />
            </a>
            <h1 className="text-[2.75rem] leading-[1] font-medium tracking-[-0.035em] sm:text-6xl sm:tracking-[-0.025em]">
              <span className="block animate-rise">Sua agenda,</span>
              <span className="block animate-rise text-muted [animation-delay:90ms]">
                aberta 24 horas.
              </span>
            </h1>
            <p className="mt-6 max-w-lg animate-rise text-[17px] leading-relaxed text-muted [animation-delay:180ms]">
              Agendamento online para barbearias, salões, clínicas e estúdios. O cliente marca pelo
              celular, o horário nunca é vendido duas vezes e o dia inteiro aparece numa linha do
              tempo.
            </p>
            <div className="mt-8 flex animate-rise flex-col gap-2.5 [animation-delay:260ms] sm:flex-row sm:items-center">
              <BotaoDemo variante="primario" tamanho="grande">
                Abrir painel demo
              </BotaoDemo>
              <LinkBotao href="/barbearia-ferraz" variante="contorno" tamanho="grande">
                Agendar como cliente
              </LinkBotao>
            </div>
            <p className="mt-4 animate-rise text-[13px] text-faint [animation-delay:320ms]">
              Sem cadastro. A conta demo volta ao estado original todos os dias.
            </p>
          </div>
          <div className="min-w-0" data-speed="0.85">
            <Trelica />
          </div>
        </section>

        <section id="produto" className="mx-auto max-w-6xl scroll-mt-24 px-5 sm:px-8">
          <Surgir>
            <DemoProduto />
          </Surgir>
        </section>

        <Secao
          id="exemplos"
          sobretitulo="Exemplos"
          titulo="Quatro negócios, um sistema."
          texto="Cada página tem cor, serviços e agenda próprios. Abra qualquer uma e marque um horário de verdade."
        >
          <CartoesExemplos />
        </Secao>

        <Secao
          id="recursos"
          sobretitulo="Recursos"
          titulo="O que faz falta no dia a dia de quem atende."
        >
          <Mosaico />
        </Secao>

        <Secao sobretitulo="Como funciona" titulo="Do cadastro ao primeiro cliente em minutos.">
          <ComoFunciona />
        </Secao>

        <Secao
          sobretitulo="Engenharia"
          titulo="Feito com o rigor de um sistema em produção."
          texto="Concorrência tratada no banco, decisões registradas e testes que tentam quebrar o sistema."
        >
          <Engenharia />
        </Secao>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-32">
          <Surgir>
            <p className="text-sm font-medium text-muted">Perguntas</p>
            <h2 className="mt-3 text-3xl leading-[1.11] font-medium tracking-[-0.02em] sm:text-4xl">
              O que costumam perguntar.
            </h2>
          </Surgir>
          <Surgir atraso={0.08}>
            <Perguntas />
          </Surgir>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 lg:pb-32">
          <Surgir className="flex flex-col gap-8 rounded-panel border border-line bg-raised p-6 shadow-3 sm:p-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-3xl leading-[1.11] font-medium tracking-[-0.02em] sm:text-4xl">
                Veja o sistema funcionando.
              </h2>
              <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted">
                O painel demo abre em um clique, sem cadastro. A arquitetura, as decisões e os
                testes estão em Como foi feito.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <BotaoDemo variante="primario" tamanho="grande">
                Abrir painel demo
              </BotaoDemo>
              <Link
                href="/como-foi-feito"
                className="group inline-flex h-11 items-center justify-center gap-1.5 px-2 text-[15px] text-link"
              >
                Como foi feito
                <ArrowRight className="size-4 transition-transform duration-200 ease-(--ease-out) group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Surgir>
        </section>
      </main>
    </PaginaInstitucional>
  );
}
