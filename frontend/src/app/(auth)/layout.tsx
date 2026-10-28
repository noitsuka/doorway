import { Logo } from "@/components/logo";
import { AlternarTema } from "@/components/tema";

const dia = [
  { inicio: 9, duracao: 1, nome: "Rafael", servico: "Corte + barba" },
  { inicio: 10.5, duracao: 0.5, nome: "Bruno", servico: "Corte" },
  { inicio: 11, duracao: 0.5, nome: "Caio", servico: "Barba" },
  { inicio: 13, duracao: 1.5, nome: "Lucas", servico: "Pigmentação" },
  { inicio: 15, duracao: 0.5, nome: "Diego", servico: "Corte" },
  { inicio: 16, duracao: 1, nome: "Marcos", servico: "Corte + barba" },
];
const PRIMEIRA_HORA = 8;
const HORAS = 10;

export default function LayoutDeAcesso({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex min-w-0 flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <AlternarTema />
        </div>
        <main className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-12">
          {children}
        </main>
      </div>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-inverse text-on-inverse lg:flex lg:flex-col lg:justify-between lg:p-14"
      >
        <p className="font-mono text-xs tracking-[0.18em] uppercase opacity-60">
          Uma terça-feira qualquer
        </p>

        <div className="relative mx-auto w-full max-w-md">
          {Array.from({ length: HORAS + 1 }, (_, i) => (
            <div
              key={i}
              className="flex h-12 items-start gap-4 border-t border-on-inverse/10 first:border-t-0"
            >
              <span className="-mt-2 w-12 font-mono text-xs opacity-50">
                {String(PRIMEIRA_HORA + i).padStart(2, "0")}:00
              </span>
            </div>
          ))}
          {dia.map((bloco, i) => (
            <div
              key={bloco.nome}
              className="absolute right-0 left-16 flex animate-enter items-center justify-between rounded-control bg-on-inverse/[0.08] px-4 text-sm ring-1 ring-on-inverse/10"
              style={{
                top: `${(bloco.inicio - PRIMEIRA_HORA) * 3}rem`,
                height: `calc(${bloco.duracao * 3}rem - 4px)`,
                animationDelay: `${400 + i * 350}ms`,
              }}
            >
              <span className="font-semibold">{bloco.nome}</span>
              <span className="opacity-60">{bloco.servico}</span>
            </div>
          ))}
          <div
            className="absolute right-0 left-16 h-px bg-accent"
            style={{ top: `${(14.25 - PRIMEIRA_HORA) * 3}rem` }}
          >
            <span className="absolute -top-1 -left-1 size-2 rounded-full bg-accent" />
          </div>
        </div>

        <p className="max-w-sm text-3xl leading-tight font-bold tracking-[-0.04em]">
          A agenda se enche sozinha enquanto você trabalha.
        </p>
      </aside>
    </div>
  );
}
