import type { SVGProps } from "react";

import { URL_AUTOR, URL_LINKEDIN } from "@/lib/demo";

type Icone = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

export const IconeGitHub: Icone = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

const IconeLinkedIn: Icone = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
);

const IconeInstagram: Icone = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

const IconeX: Icone = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
  </svg>
);

const links = [
  { rotulo: "GitHub", href: URL_AUTOR, icone: IconeGitHub },
  { rotulo: "LinkedIn", href: URL_LINKEDIN, icone: IconeLinkedIn },
  { rotulo: "Instagram", icone: IconeInstagram },
  { rotulo: "X", icone: IconeX },
];

export function LinksSociais() {
  return (
    <ul className="flex items-center gap-1">
      {links.map(({ rotulo, href, icone: Icone }) => (
        <li key={rotulo}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={rotulo}
              className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-fg/[0.06] hover:text-fg"
            >
              <Icone className="size-[18px]" />
            </a>
          ) : (
            <span
              role="img"
              aria-label={`${rotulo} (em breve)`}
              title="Em breve"
              className="grid size-10 cursor-default place-items-center rounded-full text-faint/60"
            >
              <Icone className="size-[18px]" />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
