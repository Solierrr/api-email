<p align="center">
  <img src="../assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

# Situação

Os itens abaixo refletem a main analisada em 2026-10-30. Configurações declaradas não comprovam que os ambientes estejam disponíveis.

## Implementado

- Prévia e envio de nove modelos em três idiomas, com contrato estrito, links autorizados, HTML escapado e texto simples (2026-10-30).
- Chaves próprias de `api-core` e `api-auth`, com comparação em tempo constante e compatibilidade temporária com `X-API-Key` (2026-10-30).
- Transportes SMTP e Brevo, seleção por configuração e verificação de prontidão. O levantamento anterior citava somente SMTP e provedor ainda não escolhido (2026-10-30).
- Swagger, OpenAPI exportado e conferido no CI, erros padronizados, liveness e readiness (2026-10-30).
- Mailpit no compose, coleção Bruno, exemplos dos modelos e testes com transportes substituídos por mocks (2026-10-30).
- Os manifestos de Service, Deployment e aplicação do Argo CD estão em uso na produção (2026-10-30).

## Integrações e ambientes

- O worker de convites do `api-core` chama o serviço e mantém suas próprias tentativas duráveis. Isso não significa que o `api-email` tenha retry (2026-10-30).
- O `api-auth` já tem cliente de envio, embora o fluxo central ainda descreva SMTP próprio. O cliente usa o cabeçalho legado, e sua habilitação depende de configuração (2026-10-30).
- O QA recebe as variáveis injetadas pelo Render, já que o Makefile deixa `VAULT_FOLDERS` vazio e a imagem não instala o CLI usado pelo caminho opcional do entrypoint (2026-10-30).
- A produção usa imagem versionada e o transporte Brevo, e o manifesto usa `/health` para readiness, não desliga explicitamente o Swagger e tem o workflow de ambiente verificando só o QA (2026-10-30).
- A chave legada ainda pode identificar o cliente de autenticação como `api-core`. O worker de convites também mantém dependência de configuração legada para iniciar. A retirada exige coordenação entre consumidores (2026-10-30).

## Limitações

- Aceite pelo transporte não comprova entrega, abertura ou leitura. Não há webhook de resultado nem consulta de entrega (2026-10-30).
- O envio é síncrono, sem fila ou idempotência. Uma falha de rede após aceite pode produzir duplicidade quando o chamador repete a solicitação (2026-10-30).
- Novas tentativas automáticas neste serviço continuam sem decisão. A hipótese do texto é o comportamento atual de uma chamada ao transporte por solicitação (2026-10-30). <!-- PENDENTE: 4 -->
- O histórico em `email_deliveries` foi decidido pelo responsável, mas não há schema, driver MongoDB ou gravação desse histórico na main. Não foi criado modelo de dados fictício para essa coleção (2026-10-30).
- Mensagens e descrições do contrato ainda citam SMTP mesmo quando a execução usa Brevo. O resultado documentado deve ser entendido como aceite do transporte selecionado (2026-10-30).
- `PAYLOAD_TOO_LARGE` é emitido e aparece no contrato, mas ainda não consta no catálogo central de erros analisado (2026-10-30).
- A prontidão limita a espera pela verificação, mas não confirma que um envio específico terá sucesso. A espera externa também não cancela necessariamente a verificação em andamento (2026-10-30).
- Não há instrumentação OpenTelemetry no serviço. A correlação local de erros usa `requestId` (2026-10-30).
