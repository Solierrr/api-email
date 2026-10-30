# Arquitetura

```text
src/
  config/config.ts
  config/smtp.ts
  email/
    email.schema.ts
    email.routes.ts
    email.service.tsx
    templates/ActionEmail.tsx
    templates/email.content.ts
  alerts/
    alerts.schema.ts
    alerts.model.ts
    alerts.content.ts
    adf.ts
    jira.client.ts
    incident.service.ts
    whatsapp.client.ts
    AlertEmail.tsx
    alert-email.service.tsx
    alerts.routes.ts
  http/
    openapi.ts
    problem.ts
    service-key.ts
  app.ts
  server.ts
```

Config valida variáveis antes de iniciar. Schema define contrato estrito e verifica links. Routes declara o schema OpenAPI de cada rota (gerado do schema zod, que continua sendo a única validação) e converte falhas em HTTP. http/ reúne o contrato OpenAPI e o Swagger, o formato de erro ProblemDetail e a autenticação por chave de serviço. Service renderiza e aguarda SMTP. Templates compartilham layout e textos. App permite transporte injetado em testes; server gerencia HTTP e shutdown.

React Email gera HTML de e-mail e texto simples. Nome/empresa são escapados pelo React; não existe entrada de HTML arbitrário. Layout, texto e ação vêm de @solierrr/web-lib/email, com estilos inline baseados nos tokens do UI kit compartilhado. O serviço mantém o conteúdo dos templates e idiomas; a lib mantém os componentes visuais. A entrada de browser da lib não é importada no serviço.

Remetente vem da configuração e o SMTP tem timeouts. Cada chamador tem a própria chave (X-Service-Key, SERVICE_KEY_API_CORE e SERVICE_KEY_API_AUTH), comparada em tempo constante; sem nenhuma chave configurada, tudo é recusado. A chave legada EMAIL_API_KEY, se configurada, é aceita em X-API-Key como api-core só até o api-core enviar X-Service-Key. Logs registram rota/template/messageId sem destinatários, corpo, links de ação ou credenciais. Não há login de pessoas no serviço; o CORS só libera as origens de CORS_ALLOWED_ORIGINS, para o web-sandbox ler o contrato no QA.

O layout compartilhado centraliza o conteúdo e usa o branding oficial do Solaria, com laterais estáticas do padrão dos formulários e fundo uniforme. Tipografia vem dos tokens da lib, com Plus Jakarta Sans do Google Fonts e fallback sans-serif. O SVG original é convertido para PNG no build da lib. Preview renderiza as imagens incorporadas como data URI; attachDataUrls no transporte SMTP converte as imagens em partes CID, sem carregar arquivos/URLs externos no servidor. Payloads não aceitam anexos.

DetailCard organiza empresa, motivo de reprovação e modelo aprovado. O modelo aceita modelManufacturer, modelPowerWatts e modelImageUrl opcionais; a imagem deve ser HTTPS sem credenciais e é carregada pelo cliente de e-mail, nunca pelo servidor. Sem imagem, usa placeholder incorporado derivado do asset do web-app. Fabricante e potência não são inventados quando ausentes.

## Alertas

`alerts/` recebe o webhook do Grafana e o entrega a três canais, sem tocar nos modelos transacionais. `alerts.schema.ts` lê o payload com schema tolerante (campos extras são ignorados, ao contrário de `/emails`) e exige os rótulos que as regras de alerta carregam (`alert_id`, `priority`, `service_name`, `deployment_environment`); os valores só aceitam identificadores simples porque entram em rótulos do Jira e em consultas LogQL/TraceQL dos links. `alerts.model.ts` transforma cada alerta em um incidente: chave estável (SHA-1 de alerta, serviço e ambiente), prioridade P1 a P5 mapeada para o nome da prioridade do Jira, tags, horários e links. Os links são montados com `ALERT_GRAFANA_URL` e um caminho `/d/...` validado, nunca copiados do payload. `alerts.content.ts` e `adf.ts` produzem os textos em pt-BR e o corpo do ticket em ADF, sempre em nós de texto, sem interpretar marcação.

`incident.service.ts` guarda as regras do ticket e não tem estado próprio: o Jira é o estado, consultado por rótulo (`inc-key-…`, `esc-…`). `firing` cria ticket novo se o último do mesmo alerta, serviço e ambiente tem pelo menos `ALERT_MIN_INTERVAL_MIN` minutos e se houve menos de `ALERT_MAX_PER_24H` em 24 horas (no teto, só comenta no último), liga ao anterior e ao ticket da mesma escalada com `Relates`, e escreve "ocorrência nº N" com base nos últimos 30 dias. `resolved` só grava o campo "Fim do incidente" e comenta; o serviço nunca muda status nem fecha ticket. Falha ao ligar ou comentar depois de criar o ticket não falha a notificação (volta em `warnings`); falha ao consultar ou criar responde 503 para o Grafana tentar de novo.

`jira.client.ts` e `whatsapp.client.ts` usam `fetch` com timeout, sem seguir redirecionamentos, e os erros levam só a operação e o status HTTP: corpo do provedor e credenciais não chegam a logs nem a respostas. Ambos são injetáveis em `buildApp`, como o transporte de e-mail. `AlertEmail.tsx` reaproveita `EmailLayout`, `EmailText`, `EmailAction` e `DetailCard`; o e-mail de alerta existe só em pt-BR. O WhatsApp usa o template aprovado na Meta, com quatro variáveis de uma linha (prioridade, resumo, serviço e ambiente, link) e só envia alertas `firing`.

`/ready` não consulta Jira nem WhatsApp: a falha de um canal de alerta não pode tirar do ar os e-mails transacionais. Cada rota `/alerts/*` tem `/preview`, que devolve o que seria enviado sem contato com o canal. O limite de corpo dessas rotas é 256 KiB, porque um grupo de alertas passa dos 16 KiB das rotas de e-mail. Cada canal liga só quando todas as suas variáveis existem; sem elas a rota responde 503 `CHANNEL_NOT_CONFIGURED`. A cadência (ticket a cada 35 minutos, e-mail a cada 1 h em P1 e 4 h em P2, WhatsApp só em P1) é do roteamento do Grafana, não deste serviço.

## Novo template

Os componentes usam classes Tailwind dentro do EmailLayout. O wrapper Tailwind do React Email compila essas classes para estilos inline, com tema vindo de @solierrr/web-lib/tokens e unidades de spacing em pixels. Não carregar o CSS de browser da lib nos templates. O body, container e centro usam o token operational-surface (#fafafa).

1. Adicionar nome e validação em email.schema.ts.
2. Adicionar textos nos três idiomas em templates/email.content.ts.
3. Reutilizar EmailLayout/EmailText/EmailAction de @solierrr/web-lib/email e compor o corpo.
4. Cobrir contrato, escaping e renderização; incluir exemplo Bruno.

Não gera tokens, consulta usuários ou decide permissões. Usar rede interna e HTTPS para chamadas remotas; cada servidor chamador usa a própria chave. Fila durável, deduplicação, identidade por consumidor e entrega confirmada exigem evolução explícita. Não há fila em memória fingindo persistência.
