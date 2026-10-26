# API Email

[Galeria de e-mails](https://solierrr.github.io/api-email/): exemplos estáticos dos nove templates em português, inglês e espanhol, com prévia desktop/mobile. A publicação acompanha a branch `qa` e usa apenas dados fictícios.

Serviço interno de e-mails transacionais da Solaria em TypeScript/Node.js, com Fastify, React Email e Nodemailer. A API HTTP é reutilizável por Java/Kotlin e TypeScript.

## Contrato

| Método | Rota            | Autenticação | Resultado                                            |
| ------ | --------------- | ------------ | ---------------------------------------------------- |
| GET    | /health         | pública      | Processo HTTP em execução                            |
| GET    | /ready          | pública      | SMTP acessível; 503 se indisponível                  |
| POST   | /emails/preview | X-API-Key    | subject, html e text sem envio                       |
| POST   | /emails         | X-API-Key    | 200 com status accepted e messageId após aceite SMTP |

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

Exemplos editáveis ficam diretamente em preview/. Execute `npm run preview:seed` para refletir os nove payloads no Mailpit local. São templates para fluxos documentados do app; o disparo automático pelos serviços de origem ainda depende da integração desses serviços.

Erros: 400 INVALID_REQUEST/INVALID_ACTION_URL, 401 UNAUTHORIZED, 413 para corpo maior que 16 KiB, 503 EMAIL_SEND_FAILED. Erros não revelam credenciais, links ou detalhes SMTP; requestId identifica a chamada.

**accepted significa aceite SMTP, não entrega na caixa postal.** Envio síncrono sem fila, retry automático, histórico ou idempotência. Timeout pode ocorrer após aceite; repetir pode duplicar o e-mail. idempotencyKey não faz parte deste contrato.

## Consumidores

Auth continua gerando/validando tokens e construindo links. Core decide destinatários e regras de negócio. Eles chamam esta API com chave interna. Web-app e sandbox acionam Auth/Core/BFF, sem chave de serviço no navegador.

Java/Kotlin e TypeScript usam o mesmo JSON e header HTTP; o consumidor não precisa importar os templates. O backend consumidor configura EMAIL_SERVICE_URL e EMAIL_SERVICE_API_KEY.

## Desenvolvimento

Consulte [RUNNING.md](docs/RUNNING.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [DEPLOYMENT.md](docs/DEPLOYMENT.md) e [http/README.md](http/README.md).

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run format:check
```
