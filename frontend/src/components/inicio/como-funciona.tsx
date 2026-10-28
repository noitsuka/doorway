const passos = [
  {
    hora: "09:00",
    titulo: "Cadastre o que você faz",
    texto:
      "Nome, duração e preço de cada serviço. Corte de 30 minutos, coloração de 2 horas, sessão de tatuagem de 4 horas.",
  },
  {
    hora: "09:15",
    titulo: "Diga quando você atende",
    texto: "Expediente por dia da semana, com pausa para o almoço. Sábado só de manhã também dá.",
  },
  {
    hora: "09:30",
    titulo: "Mande o link para os clientes",
    texto: "Na bio, no WhatsApp ou no Google. Às 09:31 o primeiro horário já pode estar marcado.",
  },
];

export function ComoFunciona() {
  return (
    <ol className="grid overflow-hidden rounded-panel border border-line md:grid-cols-3">
      {passos.map((passo, i) => (
        <li
          key={passo.hora}
          className={`p-5 sm:p-6 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l" : ""}`}
        >
          <span className="font-mono text-sm text-faint tabular">{passo.hora}</span>
          <h3 className="mt-6 text-lg font-semibold tracking-tight">{passo.titulo}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{passo.texto}</p>
        </li>
      ))}
    </ol>
  );
}
