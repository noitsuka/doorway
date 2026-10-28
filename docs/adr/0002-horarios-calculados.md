# 0002. Horários livres calculados na consulta

Status: aceita

## Contexto

Guardar os horários vagos numa tabela exigiria recalcular tudo a cada mudança de expediente, de duração de serviço ou de reserva, e manter essa tabela consistente com as reservas.

## Decisão

A disponibilidade é calculada a cada consulta. O expediente do dia é convertido para UTC, as reservas do dia são lidas em ordem e percorridas com um único ponteiro enquanto os horários candidatos avançam no passo configurado. A função não faz I/O.

## Consequências

- Uma única fonte de verdade: as reservas. Mudanças de expediente valem na hora.
- O custo é uma consulta por dia pedido. Ela usa o índice `(negocio_id, inicio)` e roda em autocommit, sem abrir transação.
- Por ser uma função pura, é testada com Hypothesis contra uma implementação de força bruta em centenas de agendas aleatórias. Um teste específico cobre a mudança de horário de verão.
