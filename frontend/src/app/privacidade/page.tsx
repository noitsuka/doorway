import type { Metadata } from "next";

import { PaginaInstitucional } from "@/components/inicio/pagina-institucional";
import { URL_AUTOR } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Privacidade e termos",
  description: "Quais dados o Doorway coleta, para quê e por quanto tempo.",
};

const secoes = [
  {
    titulo: "Sobre este site",
    paragrafos: [
      "O Doorway é um projeto de portfólio de código aberto. Não há empresa, cobrança nem uso comercial dos dados. O serviço é oferecido como está, sem garantia de disponibilidade.",
    ],
  },
  {
    titulo: "Dados que coletamos",
    paragrafos: [
      "Ao agendar: nome, WhatsApp ou telefone e, se você quiser, e-mail. Eles servem só para o negócio identificar quem marcou o horário.",
      "Ao criar uma conta de negócio: nome, e-mail e senha. A senha é guardada com Argon2, um algoritmo feito para que ela não possa ser recuperada nem por quem administra o banco.",
      "Quando uma busca de horário não encontra vaga, guardamos só o dia e a hora pedidos e um código derivado do IP com a data, que muda todo dia e não identifica ninguém. Isso alimenta o relatório de demanda perdida do negócio, e os registros são apagados depois de 120 dias.",
      "Para evitar agendamentos falsos, cada reserva guarda um código derivado da conexão de origem, que não permite recuperar o IP. O estabelecimento também pode bloquear um telefone ou e-mail que abuse do sistema.",
      "Não usamos cookies de rastreamento nem ferramentas de anúncio. O tema claro ou escuro e a sessão do painel ficam salvos só no seu navegador.",
    ],
  },
  {
    titulo: "Quem vê seus dados",
    paragrafos: [
      "Os dados de um agendamento só aparecem no painel do negócio em que ele foi feito. Nenhum negócio enxerga dados de outro, e isso é coberto por testes automatizados.",
      "O painel da conta demo é aberto a qualquer visitante. Por isso, quem agenda nos negócios de exemplo aparece nele só com o primeiro nome, a inicial do sobrenome e o e-mail e o telefone mascarados.",
      "O link de gerenciamento do seu agendamento usa um código longo e aleatório, para que ninguém consiga adivinhar o link de outra pessoa.",
    ],
  },
  {
    titulo: "Por quanto tempo",
    paragrafos: [
      "Os negócios de exemplo e a conta de demonstração voltam ao estado original todos os dias, e os agendamentos feitos neles são apagados nesse processo.",
    ],
  },
  {
    titulo: "Seus direitos (LGPD)",
    paragrafos: [
      "Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento. Como é um projeto pessoal, o contato é pelo perfil do autor no GitHub.",
    ],
  },
];

export default function Privacidade() {
  return (
    <PaginaInstitucional>
      <main className="mx-auto max-w-3xl px-5 pt-16 pb-24 sm:px-8 lg:pt-24">
        <p className="font-mono text-xs tracking-[0.16em] text-faint uppercase">
          Atualizado em outubro de 2026
        </p>
        <h1 className="mt-5 font-display text-5xl leading-[1.02] font-medium tracking-[-0.035em] sm:text-6xl">
          Privacidade e termos
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Em resumo: coletamos o mínimo para um agendamento funcionar, não vendemos nada e os dados
          de exemplo são apagados todos os dias.
        </p>
        <div className="mt-14 space-y-12">
          {secoes.map((secao) => (
            <section key={secao.titulo}>
              <h2 className="font-display text-2xl font-medium tracking-tight">{secao.titulo}</h2>
              <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-muted">
                {secao.paragrafos.map((paragrafo) => (
                  <p key={paragrafo}>{paragrafo}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-14 text-sm text-faint">
          Contato:{" "}
          <a
            href={URL_AUTOR}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-fg hover:underline"
          >
            github.com/noitsuka
          </a>
        </p>
      </main>
    </PaginaInstitucional>
  );
}
