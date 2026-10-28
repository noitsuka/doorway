# 0006. Busca de horário por frase, com regras

Status: aceita

## Contexto

Na página de reserva, o cliente percorre os dias um a um até achar um horário que sirva. Quem já sabe o que quer ("sexta à tarde") faz vários toques para chegar lá. Um modelo de linguagem resolveria a interpretação, mas traria custo por requisição, latência e o risco de sugerir um horário que não existe.

## Decisão

- `app/frases.py` interpreta a frase com regras: dias relativos (hoje, amanhã, depois de amanhã), dias da semana, "próxima", "semana que vem", "fim de semana", datas (`25/10`, `dia 25`) e faixas de horário (manhã, tarde, noite, "depois das 18h", "antes das 10", "entre 14 e 16", "às 15h", "9 da noite").
- O resultado é só um filtro: lista de dias e janela de horário. Os horários vêm de `horarios_reservaveis`, a mesma função da grade normal.
- `GET /publico/{slug}/busca` lê o expediente e as reservas de todo o período em duas consultas e devolve até seis horários, além de um texto dizendo o que foi entendido.
- Quando a frase não fala de dia nem de hora, a resposta diz que não entendeu e mostra exemplos de busca.
- As sugestões exibidas abaixo do campo vêm de `GET /publico/{slug}/sugestoes`, que monta frases como "amanhã à tarde" e só devolve as que têm horário livre.

## Consequências

- Resposta determinística, sem custo externo, testável como função pura.
- O vocabulário é limitado ao que as regras cobrem. Frases fora dele caem na mensagem de exemplo, e a grade de dias continua disponível.
- Um teste com Hypothesis gera textos arbitrários e garante que a função nunca lança exceção, nunca devolve dias no passado e nunca monta uma janela invertida.
