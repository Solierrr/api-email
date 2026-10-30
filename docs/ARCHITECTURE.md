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

## Novo template

Os componentes usam classes Tailwind dentro do EmailLayout. O wrapper Tailwind do React Email compila essas classes para estilos inline, com tema vindo de @solierrr/web-lib/tokens e unidades de spacing em pixels. Não carregar o CSS de browser da lib nos templates. O body, container e centro usam o token operational-surface (#fafafa).

1. Adicionar nome e validação em email.schema.ts.
2. Adicionar textos nos três idiomas em templates/email.content.ts.
3. Reutilizar EmailLayout/EmailText/EmailAction de @solierrr/web-lib/email e compor o corpo.
4. Cobrir contrato, escaping e renderização; incluir exemplo Bruno.

Não gera tokens, consulta usuários ou decide permissões. Usar rede interna e HTTPS para chamadas remotas; cada servidor chamador usa a própria chave. Fila durável, deduplicação, identidade por consumidor e entrega confirmada exigem evolução explícita. Não há fila em memória fingindo persistência.
