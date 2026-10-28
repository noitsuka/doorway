# 0007. Demanda perdida registrada nas buscas sem resultado

Status: aceita

## Contexto

O sistema só sabia de quem conseguiu reservar. Quem abria um dia cheio ou pedia "sábado à tarde" com o negócio fechado ia embora sem deixar rastro, e o dono definia o expediente sem saber quando os clientes queriam vir.

## Decisão

- `GET /publico/{slug}/horarios-livres` registra o dia quando não há horário livre, e `GET /publico/{slug}/busca` registra o dia e a hora pedidos quando a frase foi entendida mas nada se encaixa.
- Cada registro é classificado: `fechado` quando o negócio não atende naquele dia ou hora, `lotado` quando atende mas está tudo ocupado. Dias que ficaram sem horário só porque o expediente já passou não contam.
- O visitante é guardado como HMAC do IP com a data, truncado em 16 caracteres. Uma restrição única com `NULLS NOT DISTINCT` em (negócio, dia, hora, origem, visitante) faz a mesma pessoa contar uma vez, mesmo com a grade atualizando a cada 20 segundos.
- `GET /demanda` agrega por dia da semana e hora e sugere a janela de até três horas fechadas com mais pedidos, ou o dia inteiro quando esse número for maior.
- Uma falha ao registrar é só logada: a resposta ao cliente nunca depende disso.

## Consequências

- O dono vê demanda que nenhum outro relatório mostra e recebe uma sugestão concreta de horário.
- Rotas de leitura passam a escrever. O custo é um `INSERT ... ON CONFLICT DO NOTHING` só quando a resposta é vazia.
- Os números podem ser inflados por quem troca de IP de propósito. Como servem para orientar o expediente e não para cobrança, isso é aceitável.
- Nenhum dado pessoal é guardado: o código do visitante muda todo dia e não pode ser revertido.
