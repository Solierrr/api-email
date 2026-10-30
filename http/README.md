# Coleção Bruno: api-email

Abra http/ no Bruno e selecione local. Preencha serviceKey (o valor de SERVICE_KEY_API_CORE do seu .env) apenas localmente; o ambiente versionado deixa a chave vazia. Base http://localhost:8083.

GET /health verifica processo; GET /ready verifica SMTP sem enviar. POST /emails/preview renderiza HTML/texto. POST /emails [mutates] envia ao SMTP configurado: use captura Mailpit local.

Os exemplos usam origem localhost permitida pelo .env.example. Ajuste links/chave por ambiente. Não executar chamadas mutantes automaticamente ou usar destinatários reais para testes.
