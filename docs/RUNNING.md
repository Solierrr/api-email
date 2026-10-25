# Execução local

Requisitos: Node.js 24+, npm e Docker para captura SMTP.

```sh
npm ci
cp .env.example .env
```

No PowerShell: `Copy-Item .env.example .env`. Gere uma chave aleatória de pelo menos 32 caracteres e coloque em SERVICE_KEY_API_CORE (a chave que o api-core envia em X-Service-Key); SERVICE_KEY_API_AUTH é opcional. O .env é ignorado pelo Git.

## Reload local

```sh
docker compose up -d mailpit
npm run dev
```

API localhost:8083, caixa Mailpit http://localhost:8025, SMTP localhost:1025. Compose não configura relay externo. GET /ready verifica SMTP. Swagger em http://localhost:8083/docs e contrato em http://localhost:8083/openapi.json; no Authorize, informe a chave de SERVICE_KEY_API_CORE. No Bruno preencha serviceKey apenas localmente; use preview antes de enviar.

## Exemplos na caixa local

Com a API e o Mailpit rodando, execute `npm run preview:seed`. Cada JSON em `assets/mocks/emails/` representa uma chamada de envio e aparece como um e-mail em http://localhost:8025. Há um exemplo por modelo, com nome descritivo; o de modelo de placa solar aprovado mostra uma imagem do `mocks-warehouse` (origem em `assets/mocks/README.md`). Edite ou adicione arquivos e execute novamente; cada execução cria novas mensagens e preserva as anteriores.

O comando valida todos os exemplos pelo endpoint de preview antes de iniciar os envios. Usa SERVICE_KEY_API_CORE do .env, chama apenas a API em loopback e exige APP_ENV=dev com SMTP local na porta 1025. Links devem corresponder a EMAIL_ALLOWED_ORIGINS. Os tokens dos exemplos são fictícios.

## Tudo em Docker

Encerre npm run dev para liberar 8083:

```sh
docker compose up --build -d
```

Compose usa APP_ENV=dev para links HTTP locais, mesmo com runtime Node de produção. Chave vem do .env, que não entra na imagem. A caixa local é efêmera quando o container é removido.

Sem Docker, configure um capturador SMTP autorizado nas variáveis e use npm run dev.

## Atualizar o UI kit local

O serviço consome @solierrr/web-lib/email por meio do pacote local em vendor/solierrr-web-lib-0.1.0.tgz. Para atualizar, execute na web-lib `npm run build` e `npm pack --pack-destination ../api-email/vendor`; depois, neste serviço, `npm install ./vendor/solierrr-web-lib-0.1.0.tgz`. Reinicie o serviço e rode `npm run preview:seed`. O pacote local também é copiado no build Docker. Nenhuma publicação npm é necessária.

## Verificação

```sh
npm run typecheck
npm test
npm run build
npm run format:check
```

Testes automatizados não enviam e-mails externos. npm start executa dist/server.js; injete variáveis no processo ou use `node --env-file=.env dist/server.js` localmente.
