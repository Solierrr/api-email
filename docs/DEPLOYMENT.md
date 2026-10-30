# Deploy

Docker multi-stage Node.js 24: TypeScript compilado, dependências runtime e usuário node sem privilégios. `docker build -t solaria-api-email:local .` não inclui segredos.

| Variável              | Dev                        | QA/prod                                                             |
| --------------------- | -------------------------- | ------------------------------------------------------------------- |
| NODE_ENV              | development                | production                                                          |
| APP_ENV               | dev                        | qa ou prod                                                          |
| HOST                  | 127.0.0.1 (Docker 0.0.0.0) | 0.0.0.0                                                             |
| PORT                  | 8083                       | porta da plataforma                                                 |
| SERVICE_KEY_API_CORE  | aleatória >=32 caracteres  | chave do api-core em /service-keys do Infisical                     |
| SERVICE_KEY_API_AUTH  | opcional, >=32 caracteres  | chave do api-auth em /service-keys do Infisical                     |
| EMAIL_API_KEY         | vazia                      | legado: aceita X-API-Key como api-core até ele enviar X-Service-Key |
| DOCS_ENABLED          | true                       | true no QA, false em PROD                                           |
| CORS_ALLOWED_ORIGINS  | localhost:3000 e 5173      | inclui a origem do web-sandbox no QA                                |
| EMAIL_FROM            | noreply@solaria.local      | remetente autorizado                                                |
| EMAIL_ALLOWED_ORIGINS | http://localhost:5173      | origens HTTPS separadas por vírgula                                 |
| SMTP_HOST/PORT        | localhost:1025             | host/porta do provedor                                              |
| SMTP_SECURE           | false                      | true TLS direto (tipicamente 465), false STARTTLS (tipicamente 587) |
| SMTP_USER/PASSWORD    | vazios                     | par de credenciais quando exigido                                   |

### Alertas do Grafana

Todas opcionais; cada canal liga quando todas as suas variáveis existem. Sem `SERVICE_KEY_GRAFANA`, `/alerts/*` recusa tudo.

| Variável                                                        | Valor                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| SERVICE_KEY_GRAFANA                                             | chave >=32 caracteres que o Grafana envia em X-Service-Key (Infisical, /service-keys) |
| ALERT_ENVIRONMENT                                               | ambiente que gera aviso, padrão `prod`                                                |
| ALERT_GRAFANA_URL                                               | URL pública do Grafana, HTTPS em QA/prod; base dos links dos e-mails e tickets        |
| ALERT_EMAIL_TO                                                  | endereços dos devs, separados por `;`                                                 |
| ALERT_MIN_INTERVAL_MIN, ALERT_MAX_PER_24H, ALERT_LOG_WINDOW_MIN | 30, 8 e 30 por padrão                                                                 |
| JIRA_BASE_URL, JIRA_USER, JIRA_API_TOKEN                        | site do Jira, e-mail da conta do Grafana e token de API (segredo)                     |
| JIRA_PROJECT, JIRA_ISSUE_TYPE                                   | `INC` e `Incidente` por padrão                                                        |
| JIRA_FIELD_START, JIRA_FIELD_END                                | ids dos campos "Início do incidente" e "Fim do incidente" (`customfield_NNNNN`)       |
| WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID                 | token da WhatsApp Cloud API (segredo) e id do número remetente                        |
| WHATSAPP_TEMPLATE_NAME, WHATSAPP_TEMPLATE_LANGUAGE              | nome e idioma do template aprovado, idioma `pt_BR` por padrão                         |
| WHATSAPP_API_VERSION                                            | versão da Graph API, `v23.0` por padrão; confirme a versão vigente                    |
| WHATSAPP_ALERT_TO                                               | números com DDI, separados por `;`                                                    |
| WHATSAPP_API_BASE_URL                                           | opcional, só para testes: troca https://graph.facebook.com (HTTPS fora do dev)        |

O Jira precisa de uma conta própria para o Grafana, com permissão de criar, editar, comentar e ligar tickets só no projeto de incidentes. O template do WhatsApp precisa ser criado e aprovado na Meta antes do primeiro envio, na categoria de utilidade, com quatro variáveis de texto, por exemplo: `Alerta {{1}} no SOLIER: {{2}}. Serviço: {{3}}. Abrir: {{4}}`. Mensagem iniciada pela empresa fora desse template não é entregue. O Grafana precisa alcançar este serviço por HTTPS; no QA o serviço fica no Render, então defina como a rota fica protegida antes de abrir o endereço ao Grafana do GCP.

Origens completas sem path/barra final, por exemplo https://app.example.com,https://sandbox.example.com. HTTPS exigido nos links de QA/prod. SMTP exige STARTTLS em QA/prod quando SMTP_SECURE=false; certificados continuam validados. Use capturador/destinatários de teste em QA.

Produção depende de remetente/domínio e provedor configurados. Este serviço não configura DNS/SPF/DKIM/DMARC ou cria credenciais.

## Entry point e workflows

entrypoint.sh original preservado: CMD com segredos da plataforma, ou Infisical Universal Auth quando configurado. A imagem mínima não instala CLI Infisical; para usar Universal Auth instale o CLI na imagem runtime e configure ambas as credenciais em runtime. Na imagem atual injete variáveis pela plataforma e deixe credenciais Universal Auth ausentes.

Workflows básicos originais mantidos. CI adiciona typecheck, testes, build e formatação; o workflow OpenAPI exporta o contrato (`npm run openapi`), falha se o `openapi.yaml` versionado não bater com o código e roda o lint da organização. Release Please usa node, alinhado ao package.json/manifesto, e atualiza a versão do `openapi.yaml` pela marca `# x-release-please-version`.

## Operação

/health verifica só o processo e responde {"status":"UP","version":"X.Y.Z"}; /ready verifica conexão/autenticação SMTP em até 2 segundos e responde {"status":"UP"} (200) ou {"status":"DOWN"} (503), sem revelar detalhes. O healthCheckPath do Render e o environment-status usam /ready. Manter serviço interno e usar HTTPS remoto. Envio é síncrono: não repetir automaticamente após timeout, pois aceite SMTP pode ter ocorrido. Sem garantia exactly-once ou confirmação de entrega nesse MVP.
