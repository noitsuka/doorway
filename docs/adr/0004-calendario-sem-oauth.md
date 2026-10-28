# 0004. Integração com calendários sem OAuth

Status: aceita

## Contexto

Sincronizar com o Google Agenda nos dois sentidos exige um app no Google Cloud com tela de consentimento verificada. Sem verificação, o usuário vê o aviso de app não verificado e os tokens de atualização expiram em sete dias.

## Decisão

- Cliente: depois de reservar, recebe um link de template do Google Agenda (`calendar/render?action=TEMPLATE`) e um arquivo `.ics` para Apple e Outlook.
- Dono do negócio: recebe uma URL de assinatura `/agenda/{token}.ics`, que pode ser adicionada no Google Agenda, no iPhone ou no Outlook. O token é aleatório, pode ser trocado no painel e invalida o anterior.

## Consequências

- Nenhuma credencial, app ou verificação do Google.
- O feed é só leitura e os aplicativos o atualizam no próprio ritmo (o Google pode levar horas). Para atualização imediata seria necessário OAuth.
- Quem tem o link vê nome e contato dos clientes, por isso ele é tratado como segredo e pode ser trocado a qualquer momento.
