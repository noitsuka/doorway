export const TINTA = "#fafafa";
export const PAPEL = "#0a0a0a";
const DESTAQUE = "#ff8833";
export const SUAVE = "#a1a1a1";
export const LINHA = "#262626";

export function MarcaSvg({ tamanho, raio = 15 }: { tamanho: number; raio?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64">
      <rect width="64" height="64" rx={raio} fill={TINTA} />
      <rect x="15" y="15" width="8" height="34" rx="1.5" fill={PAPEL} />
      <rect x="23" y="15" width="4" height="34" fill={DESTAQUE} />
      <path d="M27 15h6a17 17 0 0 1 0 34h-6z" fill={PAPEL} />
      <circle cx="31.5" cy="32" r="2" fill={TINTA} />
    </svg>
  );
}
