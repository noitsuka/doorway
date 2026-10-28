const IDIOMA = "pt-BR";

export function dinheiro(centavos: number): string {
  return new Intl.NumberFormat(IDIOMA, { style: "currency", currency: "BRL" }).format(
    centavos / 100,
  );
}

export function preco(centavos: number): string {
  return centavos ? dinheiro(centavos) : "Grátis";
}

export function duracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function hora(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(IDIOMA, { hour: "2-digit", minute: "2-digit", timeZone }).format(
    new Date(iso),
  );
}

export function dataLonga(valor: string | Date, timeZone?: string): string {
  const data = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat(IDIOMA, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(data);
}

export function diaSemanaCurto(dia: string): string {
  return new Intl.DateTimeFormat(IDIOMA, { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${dia}T12:00:00Z`))
    .replace(".", "");
}

export function diaDoMes(dia: string): string {
  return String(Number(dia.slice(8, 10)));
}

export function mesCurto(dia: string): string {
  return new Intl.DateTimeFormat(IDIOMA, { month: "short", timeZone: "UTC" })
    .format(new Date(`${dia}T12:00:00Z`))
    .replace(".", "");
}

export function hojeEm(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function somarDias(dia: string, quantidade: number): string {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

export function minutosDoHorario(valor: string): number {
  const [h, m] = valor.split(":").map(Number);
  return h * 60 + m;
}

export function diaLocal(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(iso));
}

export function minutosDoDia(iso: string, timeZone: string): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(iso));
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return valor("hour") * 60 + valor("minute");
}

export function indiceDiaSemana(dia: string): number {
  return (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function segundaDe(dia: string): string {
  return somarDias(dia, -indiceDiaSemana(dia));
}

export function saudacao(timeZone: string): string {
  const horaAtual = Math.floor(minutosDoDia(new Date().toISOString(), timeZone) / 60);
  if (horaAtual < 5) return "Boa noite";
  if (horaAtual < 12) return "Bom dia";
  if (horaAtual < 18) return "Boa tarde";
  return "Boa noite";
}
