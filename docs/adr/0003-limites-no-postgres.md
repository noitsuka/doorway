# 0003. Limite de tentativas guardado no PostgreSQL

Status: aceita

## Contexto

Login, cadastro e reserva são rotas públicas e precisam de limite por cliente. A primeira versão guardava os contadores em memória, o que não funciona com vários workers do Gunicorn nem com funções serverless: cada processo tinha o próprio contador.

## Decisão

Contadores de janela fixa numa tabela `limites_requisicao`, atualizados com `INSERT ... ON CONFLICT DO UPDATE ... RETURNING acessos`. A chave combina a rota e o IP do cliente. O IP só vem do header do proxy quando `TRUST_REAL_IP_HEADER` está ligado.

## Consequências

- Os limites valem para todos os workers e instâncias sem um serviço a mais.
- Cada requisição limitada faz uma escrita a mais no banco. Com volume alto, o lugar certo seria Redis, com a mesma interface.
- Janela fixa permite um pico na virada da janela. Para os limites usados aqui, isso é aceitável.
