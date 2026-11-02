<p align="center">
  <img src="../assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

# Execução local

A instalação de Node e npm segue o [guia da stack TypeScript](https://github.com/Solierrr/docs-warehouse/blob/main/readme/running/TYPESCRIPT.md). Este serviço usa Node.js 24, Fastify e `.env` na raiz. Seu desenvolvimento não depende de Vite ou Firebase.

## Pré-requisitos e configuração

Use Node.js 24 ou superior, npm e Docker com Compose para a captura SMTP local. O Makefile também exige `make` e um shell compatível com `sh`.

```bash
npm ci
```

Copie o `.env.example` para `.env`, com `Copy-Item .env.example .env` no PowerShell, e preencha os dados locais, configurando a chave do chamador local sem publicar o valor. O `.env` é ignorado pelo Git.

| Nomes | Uso |
|---|---|
| `SERVICE_KEY_API_CORE`, `SERVICE_KEY_API_AUTH` | chaves dos chamadores aceitos |
| `EMAIL_FROM` | remetente validado como endereço de e-mail |
| `EMAIL_ALLOWED_ORIGINS` | origens completas permitidas para links de ação |
| `EMAIL_TRANSPORT` | seleção de SMTP ou Brevo |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | conexão SMTP |
| `SMTP_USER`, `SMTP_PASSWORD` | par opcional de autenticação SMTP |
| `BREVO_API_KEY` | credencial obrigatória quando Brevo é selecionado |
| `APP_ENV`, `NODE_ENV`, `HOST`, `PORT` | ambiente e escuta HTTP |
| `DOCS_ENABLED`, `CORS_ALLOWED_ORIGINS` | documentação pública e origens do navegador |

O `make vault` existe, mas `VAULT_FOLDERS` está vazio, e sem as pastas autorizadas o comando não gera o `.env`, por isso as configurações locais vêm do `.env.example`. O procedimento comum está no [guia de segredos](https://github.com/Solierrr/docs-warehouse/blob/main/readme/infisical/README.md).

## Servidor e caixa local

Com a configuração local preparada, inicie o Mailpit e o servidor.

```bash
docker compose up -d mailpit
npm run dev
```

A API escuta em [localhost:8083](http://localhost:8083), o Swagger fica em [localhost:8083/docs](http://localhost:8083/docs), a caixa de captura em [localhost:8025](http://localhost:8025) e o SMTP local na porta 1025. No Swagger, Authorize recebe a chave do chamador. A [coleção Bruno](https://github.com/Solierrr/api-email/blob/main/http/README.md) usa a variável local `serviceKey`.

Para executar tudo em containers, encerre o processo npm que usa a porta 8083 e execute `docker compose up --build -d`. O compose utiliza o modo de links de desenvolvimento, mesmo com Node configurado como runtime de produção. As mensagens capturadas não têm volume persistente declarado.

## Prévia e exemplos

Use primeiro `POST /emails/preview`, conforme [API.md](./API.md). A resposta permite conferir assunto, HTML e texto sem pedir envio ao transporte.

Com API e Mailpit locais ativos, `npm run preview:seed` valida os nove arquivos em `assets/mocks/emails/` pelo endpoint de prévia e, depois, envia cada um à caixa local. Cada execução acrescenta novas mensagens. O script exige ambiente de desenvolvimento, SMTP local na porta 1025 e chave de serviço, e chama somente a API em loopback.

## Comandos e verificações

Os alvos do Makefile encaminham para os scripts npm.

| Comando | Resultado |
|---|---|
| `make install` | instala o lockfile com `npm ci` |
| `make dev` | inicia reload com `tsx` e leitura de `.env` |
| `make test` | executa Vitest |
| `make lint` | typecheck e verificação de formatação |
| `make build` | compila TypeScript para `dist/` |
| `make openapi` | gera `openapi.yaml` com transporte injetado, sem SMTP nem segredo real |
| `make format` | aplica Prettier |
| `make ci` | lint, testes e build |

Os comandos equivalentes são `npm run typecheck`, `npm test`, `npm run build` e `npm run format:check`. Os testes usam transporte injetado e chamadas Brevo substituídas por mocks, sem enviar mensagens externas. `npm start` executa `dist/server.js` e precisa receber variáveis do processo. Para carregar o arquivo local nesse caminho, use `node --env-file=.env dist/server.js`.

## Desenvolvimento dos modelos

A biblioteca visual é consumida como pacote local em `vendor/`. Seu arquivo exato está no [`package.json`](https://github.com/Solierrr/api-email/blob/main/package.json). Uma atualização desse pacote exige novo empacotamento da biblioteca e atualização do pacote consumido, seguida dos testes e da revisão no Mailpit. Não é necessário publicar a biblioteca no registro para usar esse pacote local.

Para um modelo novo, inclua validação em `email.schema.ts`, textos em todos os idiomas, composição em `ActionEmail.tsx` e exemplo em `assets/mocks/emails/`. Reuse os componentes visuais de e-mail e não carregue o CSS de browser. Os testes devem conferir campos obrigatórios, escape e renderização.

## Problemas conhecidos

Chaves curtas, remetente inválido, origens malformadas e transporte sem a credencial ou host necessário impedem a partida. Credenciais SMTP devem ser fornecidas em par. Fora de desenvolvimento, origens de ação precisam usar HTTPS.

`/ready` responde 503 se a verificação do transporte falha ou ultrapassa a espera de dois segundos. A prévia não envia e-mail, mas a configuração da aplicação continua sendo validada na partida. A imagem atual não instala o CLI do Infisical, embora o entrypoint tenha um caminho que o usa. Os detalhes estão em [DEPLOY.md](./DEPLOY.md).
