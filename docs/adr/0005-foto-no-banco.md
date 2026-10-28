# 0005. Foto do negócio guardada no PostgreSQL

Status: aceita

## Contexto

O dono pode enviar uma foto ou logo para a página pública. A API roda em funções serverless, sem disco persistente, e o projeto não usa armazenamento de objetos.

## Decisão

- O navegador recorta a imagem em quadrado e a reduz para 256 px em WebP (JPEG no Safari, que não codifica WebP), ficando em poucos KB.
- O servidor aceita até 60 KB, detecta o tipo pelos bytes iniciais e recusa qualquer coisa que não seja PNG, JPEG ou WebP. SVG é recusado por poder conter script.
- A imagem fica numa tabela própria (`logos_negocio`), fora da linha do negócio, que é lida e travada a cada reserva.
- A URL pública leva a versão (`?v=3`) e é servida com `Cache-Control: immutable`. Um novo envio incrementa a versão.

## Consequências

- Nenhum serviço externo nem credencial a mais.
- O banco serve poucas imagens pequenas, e o cache do navegador e da CDN absorve as repetições.
- Para imagens grandes ou muitas por negócio, o caminho seria armazenamento de objetos com URL assinada para upload.
