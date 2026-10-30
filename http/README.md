# Coleção Bruno: api-email

Abra http/ no Bruno e selecione local. Preencha serviceKey (o valor de SERVICE_KEY_API_CORE do seu .env) e grafanaKey (o valor de SERVICE_KEY_GRAFANA) apenas localmente; o ambiente versionado deixa as chaves vazias. Base http://localhost:8083.

GET /health verifica processo; GET /ready verifica SMTP sem enviar. POST /emails/preview renderiza HTML/texto. POST /emails [mutates] envia ao SMTP configurado: use captura Mailpit local.

A pasta alerts/ reúne as rotas que o Grafana chama (jira, email e whatsapp). Cada uma tem uma prévia que não envia nada e não precisa das chaves do canal, e uma chamada [mutates]: a do Jira cria um ticket de verdade, a do WhatsApp manda mensagem de verdade e a de e-mail envia a ALERT_EMAIL_TO.

Os exemplos usam origem localhost permitida pelo .env.example. Ajuste links/chave por ambiente. Não executar chamadas mutantes automaticamente ou usar destinatários reais para testes.
