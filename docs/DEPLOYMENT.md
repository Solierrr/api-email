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

entrypoint.sh original preservado: CMD com segredos da plataforma, ou Infisical Universal Auth quando configurado. A imagem mínima não instala CLI Infisical; para usar Universal Auth instale o CLI na imagem runtime e configure ambas as credenciais em runtime. Na imagem atual injete variáveis pela plataforma e deixe credenciais Universal Auth ausentes.

Workflows básicos originais mantidos. CI adiciona typecheck, testes, build e formatação. Release Please usa node, alinhado ao package.json/manifesto 0.2.0.

## Operação

/health verifica processo; /ready verifica conexão/autenticação SMTP sem revelar detalhes. Manter serviço interno e usar HTTPS remoto. Envio é síncrono: não repetir automaticamente após timeout, pois aceite SMTP pode ter ocorrido. Sem garantia exactly-once ou confirmação de entrega nesse MVP.
