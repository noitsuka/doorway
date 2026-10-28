const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export function erroEmail(valor: string): string | undefined {
  const email = valor.trim();
  if (!email) return undefined;
  if (email.length > 254 || !EMAIL.test(email)) return "Confira o e-mail, parece incompleto.";
}

export function erroNome(valor: string): string | undefined {
  const nome = valor.trim();
  if (!nome) return "Informe seu nome.";
  if ((nome.match(/\p{L}/gu) ?? []).length < 2) return "Escreva seu nome.";
}

const digitos = (valor: string) => valor.replace(/\D/g, "");

export function formatarTelefone(valor: string): string {
  const d = digitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = `(${d.slice(0, 2)}) `;
  const resto = d.slice(2);
  if (resto.length <= 4) return ddd + resto;
  const corte = d.length === 11 ? 5 : 4;
  return `${ddd}${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

export function erroTelefone(valor: string): string | undefined {
  const d = digitos(valor);
  if (!d) return "Informe seu WhatsApp ou telefone.";
  if (d.length < 10) return "Faltam números. Use DDD + número.";
  if (d[0] === "0" || d[1] === "0") return "Esse DDD não existe.";
  if (d.length === 11 && d[2] !== "9") return "Celular com 11 dígitos começa com 9 depois do DDD.";
}

export function telefoneParaApi(valor: string): string {
  return digitos(valor);
}

export function exibirTelefone(valor: string): string {
  if (valor.includes("*")) return valor;
  const d = digitos(valor);
  return d.length === 10 || d.length === 11 ? formatarTelefone(d) : `+${d}`;
}
