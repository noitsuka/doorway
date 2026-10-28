# 0009. Proteção contra agendamentos falsos sem captcha

Status: aceita

## Contexto

A rota pública de reserva não exige conta. Isso facilita para o cliente, mas também permite que robôs ou pessoas mal-intencionadas ocupem horários com reservas falsas, usando e-mails descartáveis ou trocando de e-mail a cada pedido. Captcha resolveria parte do problema, mas acrescenta atrito justamente no passo que precisa ser rápido e depende de um serviço externo.

## Decisão

- `GET /publico/{slug}` devolve `token_formulario`: o horário de carregamento e um HMAC de `slug` e horário com o segredo da aplicação. A reserva só é aceita com um token válido do mesmo negócio, com pelo menos 3 segundos e no máximo 6 horas.
- O formulário tem um campo `site` invisível. Qualquer valor nele recusa a reserva.
- E-mails de domínios temporários conhecidos são recusados na validação, com uma mensagem clara.
- O nome de cada cliente precisa ter ao menos duas letras.
- Cada reserva guarda `conexao`, um HMAC do IP truncado em 16 caracteres. Uma mesma conexão pode ter no máximo 6 reservas futuras por negócio, contando grupos como uma reserva. A conferência roda dentro da mesma trava da reserva.
- O telefone é obrigatório e é guardado só com dígitos: é ele que identifica o cliente no limite de reservas futuras. O e-mail é opcional.
- O dono pode bloquear um cliente a partir de um agendamento. O bloqueio guarda telefone e e-mail, cancela as reservas futuras que coincidam com qualquer um dos dois e recusa novas reservas nas mesmas condições.

## Consequências

- Robôs simples falham no tempo mínimo, no token ou no campo armadilha, sem nenhum passo extra para quem é humano.
- Quem quer abusar de propósito precisa trocar de conexão a cada poucas reservas, e o dono tem como cortar quem passar.
- Conexões compartilhadas (CGNAT de operadoras) podem atingir o limite num negócio muito movimentado. O limite é configurável por `MAX_UPCOMING_BOOKINGS_PER_IP`.
- A lista de domínios temporários precisa de manutenção. Ela cobre os serviços mais usados, não todos.
- O IP nunca é guardado em claro: o HMAC usa o segredo da aplicação e não pode ser revertido.
