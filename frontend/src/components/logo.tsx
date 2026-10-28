import { LinkAncora } from "@/components/link-ancora";

export function LogoMarca({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="15" fill="var(--logo-tile)" />
      <rect x="15" y="15" width="8" height="34" rx="1.5" fill="var(--logo-door)" />
      <rect x="23" y="15" width="4" height="34" fill="var(--logo-light)" />
      <path d="M27 15h6a17 17 0 0 1 0 34h-6z" fill="var(--logo-door)" />
      <circle cx="31.5" cy="32" r="2" fill="var(--logo-tile)" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <LinkAncora
      aria-label="Doorway, página inicial"
      className={`group inline-flex items-center gap-2.5 ${className}`}
    >
      <LogoMarca className="size-8 transition-transform duration-500 ease-(--ease-out-expo) group-hover:-rotate-6" />
      <span className="font-display text-[1.35rem] leading-none font-bold tracking-[-0.04em]">
        doorway
      </span>
    </LinkAncora>
  );
}
