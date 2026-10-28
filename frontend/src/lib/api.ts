import { ErroApi, paraErro } from "@/lib/erros-api";

export { ErroApi, textoDoErro } from "@/lib/erros-api";

export const URL_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const CHAVE_SESSAO = "doorway.sessao";
const LIMITE_MS = 15_000;

export const sessao = {
  obter: () => {
    try {
      return localStorage.getItem(CHAVE_SESSAO);
    } catch {
      return null;
    }
  },
  salvar: (token: string) => localStorage.setItem(CHAVE_SESSAO, token),
  limpar: () => localStorage.removeItem(CHAVE_SESSAO),
};

export async function api<T>(
  caminho: string,
  opcoes: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, signal, ...resto } = opcoes;
  const token = sessao.obter();

  let resposta: Response;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      ...resto,
      signal: signal ?? AbortSignal.timeout(LIMITE_MS),
      headers: {
        ...(json !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : resto.body,
    });
  } catch (erro) {
    if ((erro as Error).name === "AbortError" && signal?.aborted) throw erro;
    throw new ErroApi(0, "Sem conexão com o servidor. Verifique sua internet.");
  }

  if (resposta.status === 204) return undefined as T;
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const tentarApos = Number(resposta.headers.get("retry-after")) || undefined;
    throw paraErro(resposta.status, corpo, tentarApos);
  }
  return corpo as T;
}
