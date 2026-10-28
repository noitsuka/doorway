type ErroDeValidacao = { loc?: (string | number)[]; msg?: string };

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly campos: Record<string, string> = {},
    readonly tentarApos?: number,
    readonly detalhe?: string,
  ) {
    super(mensagem);
  }
}

export function paraErro(status: number, corpo: unknown, tentarApos?: number): ErroApi {
  const detalhe = (corpo as { detail?: unknown } | null)?.detail;

  if (status === 429) {
    const espera = tentarApos ? ` Tente de novo em ${tentarApos}s.` : "";
    return new ErroApi(status, `Muitas tentativas seguidas.${espera}`, {}, tentarApos);
  }
  if (status === 503) return new ErroApi(status, "Serviço instável agora. Tente em instantes.");
  if (status >= 500) return new ErroApi(status, "Algo deu errado do nosso lado. Tente de novo.");

  if (Array.isArray(detalhe)) {
    const campos: Record<string, string> = {};
    for (const erro of detalhe as ErroDeValidacao[]) {
      const campo = String(erro.loc?.at(-1) ?? "");
      campos[campo] ??= erro.msg ?? "Valor inválido.";
    }
    return new ErroApi(status, Object.values(campos)[0] ?? "Dados inválidos.", campos);
  }
  if (typeof detalhe === "string") {
    return new ErroApi(status, detalhe, {}, undefined, detalhe);
  }
  return new ErroApi(status, "Não foi possível concluir a ação.");
}

export function textoDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : "Algo deu errado. Tente de novo.";
}
