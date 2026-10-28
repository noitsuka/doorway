import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";

const relevo = "shadow-[inset_0_1px_0_rgb(255_255_255/0.5),inset_0_-2px_6px_rgb(0_0_0/0.1)]";

const variantes = {
  primario: `bg-fg text-canvas hover:bg-fg/90 ${relevo}`,
  destaque: `bg-accent text-accent-fg hover:brightness-110 ${relevo}`,
  contorno:
    "border border-line-strong bg-raised text-fg shadow-1 hover:border-fg/30 hover:bg-surface",
  fantasma: "text-muted hover:bg-fg/[0.06] hover:text-fg",
  perigo: "text-danger hover:bg-danger-soft",
};

const tamanhos = {
  pequeno: "h-8 gap-1.5 px-3 text-[13px]",
  medio: "h-10 gap-2 px-4 text-sm",
  grande: "h-11 gap-2 px-5 text-[15px]",
};

type Estilo = { variante?: keyof typeof variantes; tamanho?: keyof typeof tamanhos };

function classeDoBotao({ variante = "primario", tamanho = "medio" }: Estilo, extra = "") {
  return `relative inline-flex shrink-0 select-none items-center justify-center rounded-control font-medium transition-[background-color,border-color,color,filter,transform] duration-150 ease-(--ease-out) active:scale-[0.97] disabled:pointer-events-none disabled:not-aria-busy:opacity-45 ${variantes[variante]} ${tamanhos[tamanho]} ${extra}`;
}

export function Botao({
  variante,
  tamanho,
  carregando,
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & Estilo & { carregando?: boolean }) {
  return (
    <button
      type={type}
      className={classeDoBotao({ variante, tamanho }, className)}
      disabled={carregando || props.disabled}
      aria-busy={carregando || undefined}
      {...props}
    >
      <span
        className={`inline-flex items-center justify-center gap-[inherit] transition-[opacity,filter,transform] duration-200 ease-(--ease-out) ${carregando ? "scale-95 opacity-0 blur-[2px]" : ""}`}
      >
        {children}
      </span>
      {carregando && (
        <span className="absolute inset-0 grid place-items-center">
          <Carregando className="size-[18px] animate-icon-in" />
        </span>
      )}
    </button>
  );
}

export function LinkBotao({
  variante,
  tamanho,
  className,
  ...props
}: ComponentProps<typeof Link> & Estilo) {
  return <Link className={classeDoBotao({ variante, tamanho }, className)} {...props} />;
}

const classeDoCampo =
  "h-12 w-full rounded-control border border-line-strong bg-raised px-4 text-base text-fg transition-[border-color,box-shadow] placeholder:text-faint hover:border-fg/30 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 aria-invalid:border-danger aria-invalid:ring-danger/15";

export function Campo({
  rotulo,
  dica,
  erro,
  className = "",
  ...props
}: ComponentProps<"input"> & { rotulo: string; dica?: string; erro?: string }) {
  const id = useId();
  const nota = erro ?? dica;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={nota ? `${id}-nota` : undefined}
        className={classeDoCampo}
        {...props}
      />
      {nota && (
        <p
          id={`${id}-nota`}
          className={`mt-1.5 text-[13px] ${erro ? "text-danger" : "text-muted"}`}
        >
          {nota}
        </p>
      )}
    </div>
  );
}

export function Cartao({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-panel border border-line bg-raised shadow-2 ${className}`}
      {...props}
    />
  );
}

export function Aviso({
  tom = "perigo",
  children,
}: {
  tom?: "perigo" | "sucesso";
  children: ReactNode;
}) {
  const estilos = tom === "perigo" ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok";
  return (
    <p role="alert" className={`rounded-control px-4 py-3 text-sm font-medium ${estilos}`}>
      {children}
    </p>
  );
}

export function Carregando({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Carregando"
      className={`size-5 animate-spinner ${className}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2.5" />
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        strokeDashoffset={70}
        className="animate-spinner-arc"
      />
    </svg>
  );
}

export function Esqueleto({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-control bg-fg/[0.06] ${className}`} />;
}
