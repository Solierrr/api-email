# API Email

Serviço interno de e-mails transacionais da Solaria em TypeScript/Node.js, com Fastify, React Email e Nodemailer. A API HTTP é reutilizável por Java/Kotlin e TypeScript.

## Contrato

| Método | Rota              | Autenticação  | Resultado                                                           |
| ------ | ----------------- | ------------- | ------------------------------------------------------------------- |
| GET    | /health           | pública       | Processo HTTP em execução e versão                                  |
| GET    | /ready            | pública       | transporte de e-mail acessível (SMTP ou Brevo); 503 se indisponível |
| POST   | /emails/preview   | X-Service-Key | subject, html e text sem envio                                      |
| POST   | /emails           | X-Service-Key | 200 com status accepted e messageId após aceite do transporte       |
| POST   | /alerts/jira      | X-Service-Key | tickets do alerta no Jira (grafana)                                 |
| POST   | /alerts/email     | X-Service-Key | e-mail do alerta aos devs (grafana)                                 |
| POST   | /alerts/whatsapp  | X-Service-Key | mensagem de WhatsApp do alerta (grafana)                            |
| POST   | /alerts/*/preview | X-Service-Key | o que seria enviado, sem contato com o canal (grafana)              |

O contrato OpenAPI é gerado do código: Swagger em `/docs` e contrato em `/openapi.json` (desligados com `DOCS_ENABLED=false`, o caso de PROD), e `openapi.yaml` versionado na raiz, exportado por `make openapi` e conferido no CI. Chamadores aceitos: api-core (`SERVICE_KEY_API_CORE`) e api-auth (`SERVICE_KEY_API_AUTH`) em `/emails`; o Grafana (`SERVICE_KEY_GRAFANA`) apenas em `/alerts/*`. Cada chave só abre as rotas do seu chamador. A mesma chave também vale como `Authorization: Bearer`, que é como o Grafana a envia (ele só guarda cifrada essa credencial).

```json
{
  "template": "email-verification",
  "locale": "pt-BR",
  "to": "user@example.com",
  "data": {
    "name": "David",
    "actionUrl": "http://localhost:5173/pt-BR/verificar-email?token=example"
  }
}
```

Templates: email-verification, password-reset, company-invitation, project-invitation, user-deletion, registration-approved, registration-rejected, solar-model-approved e company-email-verification. Idiomas: pt-BR (padrão), en-US e es-ES. Nome opcional; convite e verificação corporativa exigem data.companyName, convite de projeto exige data.projectName, data.projectRole e data.invitationExpiresAt, aprovação de modelo exige data.modelName e reprovação exige data.reason. data.actionUrl é obrigatório, exceto no aviso de exclusão, que não exibe botão. Um destinatário por chamada. Campos desconhecidos, HTML/remetente arbitrários e links fora de EMAIL_ALLOWED_ORIGINS são rejeitados.

Exemplos editáveis ficam em assets/mocks/emails/, e as imagens que eles usam, em assets/mocks/images/. Execute `npm run preview:seed` para refletir os nove payloads no Mailpit local. São templates para fluxos documentados do app; o disparo automático pelos serviços de origem ainda depende da integração desses serviços.

Erros em `application/problem+json` (`type`, `title`, `status`, `errorCode`, `detail`, `instance`, `timestamp`, `requestId`): 422 VALIDATION_FAILED (com `errors`) ou MALFORMED_REQUEST, 400 INVALID_ACTION_URL, 401 UNAUTHENTICATED, 403 FORBIDDEN, 413 PAYLOAD_TOO_LARGE (corpo maior que 16 KiB), 503 EMAIL_SEND_FAILED e 500 INTERNAL_ERROR. Erros não revelam credenciais, links ou detalhes SMTP; requestId identifica a chamada nos logs.

**accepted significa aceite SMTP, não entrega na caixa postal.** Envio síncrono sem fila, retry automático, histórico ou idempotência. Timeout pode ocorrer após aceite; repetir pode duplicar o e-mail. idempotencyKey não faz parte deste contrato.

## Alertas do Grafana

O Grafana envia os alertas só para este serviço, com o payload padrão do webhook, uma rota por canal: `/alerts/jira` cria e liga os tickets do projeto de incidentes (um ticket novo a cada 30 minutos por alerta, serviço e ambiente, no máximo 8 em 24 horas, com histórico ligado e início e fim do incidente; o ticket nunca é fechado pelo serviço), `/alerts/email` envia o e-mail com o layout da Solaria a `ALERT_EMAIL_TO` e `/alerts/whatsapp` envia o template aprovado a `WHATSAPP_ALERT_TO`. Cada canal liga sozinho quando todas as suas variáveis existem; sem elas a rota responde 503 CHANNEL_NOT_CONFIGURED, e a prévia continua funcionando. Só o ambiente de `ALERT_ENVIRONMENT` (padrão `prod`) gera aviso. Destinatários, ambiente e a URL do Grafana vêm da configuração, nunca do payload. Veja [ARCHITECTURE.md](docs/ARCHITECTURE.md) e [DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Consumidores

Auth continua gerando/validando tokens e construindo links. Core decide destinatários e regras de negócio. Eles chamam esta API com chave interna. Web-app e sandbox acionam Auth/Core/BFF, sem chave de serviço no navegador.

Java/Kotlin e TypeScript usam o mesmo JSON e header HTTP; o consumidor não precisa importar os templates. O backend consumidor envia a própria chave de serviço (`SERVICE_KEY`) no cabeçalho X-Service-Key.

## Desenvolvimento

Consulte [RUNNING.md](docs/RUNNING.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [DEPLOYMENT.md](docs/DEPLOYMENT.md) e [http/README.md](http/README.md).

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run format:check
```
