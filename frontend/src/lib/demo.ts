import { api, sessao } from "./api";

export const URL_GITHUB = "https://github.com/noitsuka/doorway";
export const URL_AUTOR = "https://github.com/noitsuka";
export const URL_LINKEDIN = "https://www.linkedin.com/in/gabriel-barreto-dev";
export const EMAIL_DEMO = "demo@doorway.app";

export async function entrarNaDemo(): Promise<void> {
  const { token_acesso } = await api<{ token_acesso: string }>("/autenticacao/demo", {
    method: "POST",
  });
  sessao.salvar(token_acesso);
}
