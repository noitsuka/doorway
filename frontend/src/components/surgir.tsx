"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function Surgir({
  children,
  atraso = 0,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay: atraso, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
