# 0008. Reserva em grupo como um único bloco

Status: aceita

## Contexto

Famílias e grupos de amigos querem horários seguidos. Fazer uma reserva por pessoa deixa uma janela em que a primeira entra e a segunda perde o horário para outro cliente, e o grupo fica pela metade.

## Decisão

- `POST /publico/{slug}/agendamentos/grupo` recebe de 2 a 4 pessoas, cada uma com o seu serviço, e um contato único.
- Os serviços são travados juntos com `SELECT ... FOR UPDATE OF negocios`, a mesma trava da reserva simples. O bloco é validado como um intervalo com a soma das durações, pelo mesmo cálculo de disponibilidade.
- Os agendamentos são gravados em sequência na mesma transação, com uma coluna `grupo` em comum. A restrição de exclusão continua sendo a barreira final: qualquer conflito desfaz o grupo inteiro.
- Reserva simples e reserva em grupo usam a mesma função (`reservar_em_sequencia`), com uma pessoa no caso simples.
- O limite de reservas futuras por telefone conta o grupo como uma reserva.
- `GET /publico/{slug}/horarios-livres` e `/busca` aceitam `servico_id` repetido e só oferecem inícios em que o bloco inteiro cabe.

## Consequências

- Ou todos entram, ou ninguém: não existe grupo pela metade.
- Cada pessoa recebe o próprio link de gestão e pode cancelar ou remarcar a sua parte sem afetar as outras.
- Um teste dispara um grupo e uma reserva simples no mesmo instante, disputando um horário do meio do bloco, e confere que exatamente uma vence.
