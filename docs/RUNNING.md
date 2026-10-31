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

## Alertas do Grafana localmente

Defina SERVICE_KEY_GRAFANA no .env (>=32 caracteres) e, para ver os e-mails no Mailpit, ALERT_EMAIL_TO com endereços de teste e ALERT_GRAFANA_URL=http://localhost:3000. As rotas `/alerts/*/preview` funcionam sem as chaves do Jira e do WhatsApp; use as chamadas da pasta `http/alerts/` no Bruno. Para exercitar o Jira ou o WhatsApp sem as contas reais, aponte JIRA_BASE_URL para um receptor local de teste (HTTP só é aceito com APP_ENV=dev). Rotas sem as variáveis do canal respondem 503 CHANNEL_NOT_CONFIGURED.

## Tudo em Docker

Encerre npm run dev para liberar 8083:

```sh
docker compose up --build -d
```

Compose usa APP_ENV=dev para links HTTP locais, mesmo com runtime Node de produção. Chave vem do .env, que não entra na imagem. A caixa local é efêmera quando o container é removido.

Sem Docker, configure um capturador SMTP autorizado nas variáveis e use npm run dev.

## Atualizar o UI kit local

O serviço consome `@solaria.network/web-lib/email` por meio do pacote local versionado em `vendor/`. Para atualizar, execute `npm run build` e `npm pack --pack-destination ../api-email/vendor` na `web-lib`, atualize o caminho do tarball em `package.json` e execute `npm install` neste serviço. Reinicie a API e rode `npm run preview:seed`. O Docker copia o diretório `vendor` antes de executar `npm ci`; nenhuma publicação npm é necessária.

## Galeria estática

Execute `npm run gallery:build` para gerar `gallery-dist/` e `npm run gallery:preview` para abrir a prévia local. O resultado pode ser servido por qualquer servidor HTTP estático. Não é necessário `.env`, API, SMTP ou Mailpit.

O gerador reutiliza `renderEmail`, os componentes de `@solaria.network/web-lib/email` e os exemplos de `preview/`. Gera os três idiomas para cada template registrado, substitui destinatário e URL de ação por dados de demonstração e desativa os links dentro dos e-mails. A prévia fica em um iframe com sandbox.

A interface em `gallery/` utiliza os componentes de browser da web-lib por meio do alias de desenvolvimento `@solaria.network/gallery-ui`. Esse snapshot separado preserva o pacote de e-mail e seu branding atual. Navbar, menus e seleção de proporção reutilizam `OrganicLogo`, `MenuList`, `MenuItem`, `SurfaceGroup` e `GroupAction`, com CSS compilado pelo Vite/Tailwind. Os assuntos dos templates são curtos e não repetem o nome do projeto.

A navbar mantém a logo no tamanho do sandbox e os acessos GitHub/idioma à direita. O controle de dispositivo pertence à prévia; o contêiner acompanha a largura desktop/mobile. A scrollbar exportada por `@solaria.network/gallery-ui/scrollbar.css` também é aplicada aos HTMLs da galeria, para funcionar dentro do iframe sem alterar os estilos dos e-mails enviados.

O workflow `Email gallery` valida a geração em pull requests e publica no GitHub Pages após push em `qa`. O repositório deve ter Pages configurado para GitHub Actions. A galeria é pública e não consulta mensagens recebidas ou credenciais do ambiente QA.

## Verificação do serviço

```sh
npm run typecheck
npm test
npm run build
npm run format:check
```

Testes automatizados não enviam e-mails externos. npm start executa dist/server.js; injete variáveis no processo ou use `node --env-file=.env dist/server.js` localmente.
