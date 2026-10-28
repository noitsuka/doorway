import type { CSSProperties } from "react";

export function estiloDaMarca(cor: string): CSSProperties {
  return {
    ["--accent" as string]: cor,
    ["--accent-fg" as string]: "#ffffff",
    ["--accent-soft" as string]: `color-mix(in oklab, ${cor} 13%, var(--raised))`,
  };
}
