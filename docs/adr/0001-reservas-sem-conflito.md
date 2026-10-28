# 0001. Reservas sem conflito sob concorrência

Status: aceita

## Contexto

Dois clientes podem pedir o mesmo horário no mesmo instante. Conferir se o horário está livre e depois gravar deixa uma janela em que as duas requisições passam pela conferência.

## Decisão

Toda criação ou remarcação de reserva roda numa transação que:

1. trava a linha do negócio com `SELECT ... FOR UPDATE`;
2. confere se o intervalo continua livre;
3. grava a reserva.

Por baixo, uma restrição de exclusão (`btree_gist`, `tstzrange ... WITH &&`) impede qualquer sobreposição de reservas não canceladas do mesmo negócio, mesmo que algum caminho de código esqueça a trava.

## Consequências

- A restrição sozinha resolvia a duplicidade, mas o teste com dezenas de inserções simultâneas mostrou deadlock entre transações que esperavam umas pelas outras dentro do índice. A trava por negócio ordena as transações e elimina o deadlock.
- Reservas de um mesmo negócio ficam serializadas. Para um negócio pequeno, o volume é baixo o bastante para isso não aparecer. Negócios diferentes não disputam a mesma trava.
- O teste de concorrência roda na CI contra PostgreSQL. O SQLite não tem restrição de exclusão, então esses testes são pulados nele.
