export type Negocio = {
  id: number;
  nome: string;
  slug: string;
  fuso_horario: string;
  categoria: string | null;
  chamada: string | null;
  cor_marca: string;
  versao_logo: number | null;
  token_agenda: string;
};

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  negocio: Negocio;
};

export type Servico = {
  id: number;
  nome: string;
  duracao_minutos: number;
  preco_centavos: number;
  ativo: boolean;
};

export type Horario = {
  dia_semana: number;
  abre_as: string;
  fecha_as: string;
};

export type NegocioPublico = {
  nome: string;
  slug: string;
  fuso_horario: string;
  categoria: string | null;
  chamada: string | null;
  cor_marca: string;
  versao_logo: number | null;
  servicos: Servico[];
  token_formulario: string;
};

export type HorariosLivres = {
  data: string;
  servicos: number[];
  duracao_minutos: number;
  horarios: string[];
};

export type DiasLivres = { dias: { data: string; livres: number }[] };

export type Bloqueio = {
  id: number;
  email: string | null;
  telefone: string | null;
  criado_em: string;
};

export type Busca = {
  entendido: boolean;
  rotulo_dia: string | null;
  rotulo_horario: string | null;
  horarios: string[];
};

export type Agendamento = {
  id: number;
  servico: Servico;
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  inicio: string;
  fim: string;
  status: "confirmado" | "cancelado";
  grupo: string | null;
};

export type AgendamentoReservado = Agendamento & { token_gestao: string };

export type ReservaEmGrupo = { grupo: string; agendamentos: AgendamentoReservado[] };

export type Acompanhante = { chave: string; nome: string; servico: Servico };

export type Demanda = {
  periodo_dias: number;
  total: number;
  fechado: number;
  lotado: number;
  celulas: { dia_semana: number; hora: number | null; fechado: number; lotado: number }[];
  sugestao: { dia_semana: number; de: number | null; ate: number | null; pedidos: number } | null;
};

export type AgendamentoGerenciado = Agendamento & {
  negocio: Pick<NegocioPublico, "nome" | "slug" | "fuso_horario" | "categoria" | "cor_marca">;
};

export type ResultadoCorrida = {
  horario: string;
  pedidos: number;
  aceitos: number;
  recusados: number;
  duracao_ms: number;
  tentativas: { pedido: number; aceito: boolean; duracao_ms: number }[];
};

export type AgendaDoDia = {
  data: string;
  quantidade: number;
};
