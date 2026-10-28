"use client";

import { createContext, useContext } from "react";

import type { Usuario } from "@/lib/tipos";

export const ContextoSessao = createContext<Usuario | null>(null);
export const ContextoAtualizarSessao = createContext<(usuario: Usuario) => void>(() => {});

export function useSessao(): Usuario {
  const usuario = useContext(ContextoSessao);
  if (!usuario) throw new Error("useSessao precisa ser usado dentro do painel");
  return usuario;
}

export function useAtualizarSessao() {
  return useContext(ContextoAtualizarSessao);
}
