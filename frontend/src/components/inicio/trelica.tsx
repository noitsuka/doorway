"use client";

import { motion } from "motion/react";

const molduras = [
  { tamanho: 300, giro: -14, opacidade: 0.14, atraso: 0 },
  { tamanho: 260, giro: 9, opacidade: 0.22, atraso: 0.08 },
  { tamanho: 220, giro: -4, opacidade: 0.35, atraso: 0.16 },
  { tamanho: 176, giro: 18, opacidade: 0.5, atraso: 0.24 },
];

export function Trelica() {
  return (
    <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[26rem]">
      <svg viewBox="-200 -200 400 400" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id="espectro" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.15" stopColor="#ffb931" />
            <stop offset="0.3" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#2e73fc" />
            <stop offset="1" stopColor="#2e73fc" stopOpacity="0" />
          </linearGradient>
          <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {molduras.map((moldura) => (
          <motion.g
            key={moldura.tamanho}
            initial={{ opacity: 0, scale: 0.94, rotate: moldura.giro - 6 }}
            animate={{ opacity: 1, scale: 1, rotate: moldura.giro }}
            transition={{ duration: 1.4, delay: moldura.atraso, ease: [0.23, 1, 0.32, 1] }}
          >
            <rect
              x={-moldura.tamanho / 2}
              y={-moldura.tamanho / 2}
              width={moldura.tamanho}
              height={moldura.tamanho}
              rx={moldura.tamanho * 0.08}
              fill="none"
              stroke="var(--fg)"
              strokeOpacity={moldura.opacidade * 0.6}
              strokeWidth="6"
              filter="url(#brilho)"
            />
            <rect
              x={-moldura.tamanho / 2}
              y={-moldura.tamanho / 2}
              width={moldura.tamanho}
              height={moldura.tamanho}
              rx={moldura.tamanho * 0.08}
              fill="none"
              stroke="var(--fg)"
              strokeOpacity={moldura.opacidade}
              strokeWidth="1"
            />
          </motion.g>
        ))}

        <rect
          x={-130}
          y={-130}
          width={260}
          height={260}
          rx={21}
          transform="rotate(9)"
          fill="none"
          stroke="url(#espectro)"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="0.22 0.78"
          className="animate-trace"
        />

        <motion.g
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <rect x="-46" y="-46" width="92" height="92" rx="20" fill="var(--logo-tile)" />
          <rect x="-24" y="-24" width="12" height="49" rx="2" fill="var(--logo-door)" />
          <rect x="-12" y="-24" width="6" height="49" fill="var(--logo-light)" />
          <path d="M-6 -24h9a24.5 24.5 0 0 1 0 49h-9z" fill="var(--logo-door)" />
          <circle cx="0.5" cy="0.5" r="2.8" fill="var(--logo-tile)" />
          <rect
            x="-12"
            y="-24"
            width="6"
            height="49"
            fill="var(--logo-light)"
            opacity="0.6"
            filter="url(#brilho)"
          />
        </motion.g>
      </svg>
    </div>
  );
}
