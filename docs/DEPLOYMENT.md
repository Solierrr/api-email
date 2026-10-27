# Deploy

Docker multi-stage Node.js 24: TypeScript compilado, dependências runtime e usuário node sem privilégios. `docker build -t solaria-api-email:local .` não inclui segredos.

| Variável              | Dev                        | QA/prod                                                             |
| --------------------- | -------------------------- | ------------------------------------------------------------------- |
| NODE_ENV              | development                | production                                                          |
| APP_ENV               | dev                        | qa ou prod                                                          |
| HOST                  | 127.0.0.1 (Docker 0.0.0.0) | 0.0.0.0                                                             |
| PORT                  | 8083                       | porta da plataforma                                                 |
| EMAIL_API_KEY         | aleatória >=32 caracteres  | segredo interno por ambiente                                        |
| EMAIL_FROM            | noreply@solaria.local      | remetente autorizado                                                |
| EMAIL_ALLOWED_ORIGINS | http://localhost:5173      | origens HTTPS separadas por vírgula                                 |
| SMTP_HOST/PORT        | localhost:1025             | host/porta do provedor                                              |
| SMTP_SECURE           | false                      | true TLS direto (tipicamente 465), false STARTTLS (tipicamente 587) |
| SMTP_USER/PASSWORD    | vazios                     | par de credenciais quando exigido                                   |

Origens completas sem path/barra final, por exemplo https://app.example.com,https://sandbox.example.com. HTTPS exigido nos links de QA/prod. SMTP exige STARTTLS em QA/prod quando SMTP_SECURE=false; certificados continuam validados. Use capturador/destinatários de teste em QA.

Produção depende de remetente/domínio e provedor configurados. Este serviço não configura DNS/SPF/DKIM/DMARC ou cria credenciais.

## Entry point e workflows

O entrypoint executa o CMD com os segredos da plataforma, ou autentica por Infisical Universal Auth quando ambas as credenciais estão configuradas. A imagem instala o CLI 0.44.9 com checksum verificado. O bootstrap carrega a raiz do ambiente e depois `/email`, preservando os valores dessa pasta para o provedor e o remetente. `INFISICAL_ENV` seleciona `qa` ou `prod`.

Para Brevo, configure `EMAIL_TRANSPORT=brevo`, `BREVO_API_KEY` e `EMAIL_FROM`. A chave interna pode ser fornecida como `EMAIL_API_KEY` ou `SERVICE_KEY_API_EMAIL`. O transporte usa HTTPS e não depende das portas SMTP bloqueadas no Render gratuito. Autorize no Brevo as faixas de saída informadas pelo Render. O modo `smtp` continua disponível para Mailpit e provedores SMTP em hospedagens compatíveis.

Workflows básicos originais mantidos. CI adiciona typecheck, testes, build e formatação. Release Please usa node, alinhado ao package.json/manifesto 0.2.0.

## Operação

/health verifica processo; /ready verifica acesso ao transporte selecionado sem enviar mensagens nem revelar detalhes. O Swagger fica em `/docs/` e o contrato em `/openapi.json`; as operações de envio e prévia continuam exigindo a chave interna. Manter serviço interno e usar HTTPS remoto. Envio é síncrono: não repetir automaticamente após timeout, pois o provedor pode ter aceitado a mensagem. Sem garantia exactly-once ou confirmação de entrega nesse MVP.
