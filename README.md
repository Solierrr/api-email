# API Email

[Galeria de e-mails](https://solierrr.github.io/api-email/): exemplos estáticos dos nove templates em português, inglês e espanhol, com prévia desktop/mobile. A publicação acompanha a branch `qa` e usa apenas dados fictícios.

Serviço interno de e-mails transacionais da Solaria em TypeScript/Node.js, com Fastify, React Email e Nodemailer. A API HTTP é reutilizável por Java/Kotlin e TypeScript.

## Contrato

| Método | Rota            | Autenticação | Resultado                                                   |
| ------ | --------------- | ------------ | ----------------------------------------------------------- |
| GET    | /health         | pública      | Processo HTTP em execução                                   |
| GET    | /ready          | pública      | Transporte acessível; 503 se indisponível                   |
| POST   | /emails/preview | X-API-Key    | subject, html e text sem envio                              |
| POST   | /emails         | X-API-Key    | 200 com status accepted e messageId após aceite do provedor |

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

**accepted significa aceite do provedor, não entrega na caixa postal.** Envio síncrono sem fila, retry automático, histórico ou idempotência. Timeout pode ocorrer após aceite; repetir pode duplicar o e-mail. idempotencyKey não faz parte deste contrato.

## Swagger e envio no QA

O Swagger interativo fica em `/docs/`; o contrato JSON está em `/openapi.json`.
Clique em **Authorize** e informe a chave interna `EMAIL_API_KEY` (ou seu nome canônico no cofre, `SERVICE_KEY_API_EMAIL`). A chave do Brevo fica apenas no servidor.

Use `POST /emails/preview` para conferir o template sem enviar. Para envio real, use `POST /emails`, troque `to` pelo seu e-mail e escolha um dos nove templates em `template`. `locale` e `data` seguem o mesmo contrato acima. No QA, `actionUrl` deve usar uma origem HTTPS de `EMAIL_ALLOWED_ORIGINS`, como `https://solarianetwork.site`.

O transporte é selecionado por `EMAIL_TRANSPORT`: `smtp` (padrão, para Mailpit local) ou `brevo` (HTTPS, para QA/produção). Brevo exige `BREVO_API_KEY` e remetente autorizado em `EMAIL_FROM`; não exige variáveis SMTP. Os templates continuam sendo renderizados neste serviço.

`GET /ready` verifica acesso ao transporte sem enviar mensagens. No Brevo, verifica a API transacional; validação do remetente e entrega efetiva também dependem da configuração do provedor. Se houver restrição por IP, autorize as faixas de saída do serviço Render no Brevo.

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
