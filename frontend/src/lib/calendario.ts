import type { Agendamento } from "./tipos";

function carimbo(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function titulo(agendamento: Agendamento, nomeNegocio: string) {
  return `${agendamento.servico.nome} · ${nomeNegocio}`;
}

export function urlGoogleAgenda(agendamento: Agendamento, nomeNegocio: string, detalhes = "") {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", titulo(agendamento, nomeNegocio));
  url.searchParams.set("dates", `${carimbo(agendamento.inicio)}/${carimbo(agendamento.fim)}`);
  if (detalhes) url.searchParams.set("details", detalhes);
  return url.toString();
}

export function urlOutlook(agendamento: Agendamento, nomeNegocio: string, detalhes = "") {
  const url = new URL("https://outlook.live.com/calendar/0/deeplink/compose");
  url.searchParams.set("path", "/calendar/action/compose");
  url.searchParams.set("rru", "addevent");
  url.searchParams.set("subject", titulo(agendamento, nomeNegocio));
  url.searchParams.set("startdt", new Date(agendamento.inicio).toISOString());
  url.searchParams.set("enddt", new Date(agendamento.fim).toISOString());
  if (detalhes) url.searchParams.set("body", detalhes);
  return url.toString();
}
