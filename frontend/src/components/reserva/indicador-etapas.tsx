import { Check } from "lucide-react";

const ETAPAS = ["Serviço", "Horário", "Seus dados"];

export function IndicadorEtapas({ atual }: { atual: number }) {
  return (
    <nav aria-label="Etapas" className="mx-auto mb-8 max-w-6xl px-5 sm:px-8">
      <ol className="flex items-center gap-2 text-sm">
        {ETAPAS.map((rotulo, i) => (
          <li key={rotulo} className="flex items-center gap-2">
            <span
              aria-current={i === atual ? "step" : undefined}
              className={`flex items-center gap-2 ${i <= atual ? "text-fg" : "text-faint"}`}
            >
              <span
                className={`grid size-6 place-items-center rounded-full font-mono text-xs transition-colors duration-300 ${
                  i < atual
                    ? "bg-accent text-accent-fg"
                    : i === atual
                      ? "border-2 border-accent text-accent"
                      : "border border-line-strong"
                }`}
              >
                {i < atual ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={i === atual ? "font-medium" : "hidden sm:inline"}>{rotulo}</span>
            </span>
            {i < ETAPAS.length - 1 && (
              <span className="relative h-px w-6 overflow-hidden bg-line-strong sm:w-10">
                <span
                  className={`absolute inset-0 origin-left bg-accent transition-transform duration-500 ease-(--ease-out) ${i < atual ? "scale-x-100" : "scale-x-0"}`}
                />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
