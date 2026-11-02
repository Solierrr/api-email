<p align="center">
  <img src="./assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

<p align="center">
  <img src="./assets/readme/stacks/typescript.png" width="100" hspace="8" alt="TypeScript" title="TypeScript">
  <img src="./assets/readme/stacks/zod.png" width="100" hspace="8" alt="Zod" title="Zod">
  <img src="./assets/readme/stacks/react.png" width="100" hspace="8" alt="React" title="React">
  <img src="./assets/readme/stacks/swagger.png" width="100" hspace="8" alt="Swagger" title="Swagger">
  <img src="./assets/readme/stacks/bruno.png" width="100" hspace="8" alt="Bruno" title="Bruno">
  <img src="./assets/readme/stacks/mailpit.png" width="100" hspace="8" alt="Mailpit" title="Mailpit">
  <img src="./assets/readme/stacks/brevo.png" width="100" hspace="8" alt="Brevo" title="Brevo">
</p>

# E-mails transacionais

[![License](https://img.shields.io/github/license/Solierrr/api-email)](https://github.com/Solierrr/api-email/blob/main/LICENSE)
[![GitHub Last Commit](https://img.shields.io/github/last-commit/Solierrr/api-email)](https://github.com/Solierrr/api-email/commits)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/Solierrr/api-email)](https://github.com/Solierrr/api-email/pulls)
[![Release](https://img.shields.io/github/v/release/Solierrr/api-email)](https://github.com/Solierrr/api-email/releases)

Este serviço monta e envia mensagens sobre acontecimentos da conta, das empresas e dos projetos. Ele atende os serviços que precisam comunicar uma confirmação de cadastro, recuperação de senha, convite ou resultado de análise. Os modelos têm textos em português, inglês e espanhol e compartilham a apresentação visual da plataforma. A pessoa recebe a mensagem em seu e-mail e usa o link apresentado para continuar a ação correspondente.

Os serviços chamadores fornecem o destinatário e os dados do modelo. Fastify valida o pedido, React Email monta HTML e texto simples, e o transporte configurado encaminha a mensagem por SMTP ou pela API do Brevo. A confirmação indica aceite pelo transporte, sem comprovar chegada à caixa postal. Também é possível obter uma prévia sem enviar a mensagem. No ambiente local, o Mailpit permite conferir o resultado.

## Aprofunde-se no Projeto!

- [OVERVIEW.md](./docs/OVERVIEW.md), modelos disponíveis e regras das mensagens.
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md), componentes, transportes, integrações e decisões técnicas.
- [RUNNING.md](./docs/RUNNING.md), configuração, comandos e testes locais.
- [API.md](./docs/API.md), autenticação, contrato, erros e exemplos de chamadas.
- [DEPLOY.md](./docs/DEPLOY.md), ambientes, configuração e publicação.
- [STATUS.md](./docs/STATUS.md), limitações e diferenças em relação ao levantamento anterior.
- [Fluxos](./flows/), prévia e envio da mensagem.
- [PENDENCIAS.md](./PENDENCIAS.md), dúvidas de configuração e decisões ainda abertas.

## Contribuindo

- [CONTRIBUTING.md](https://github.com/Solierrr/.github/blob/main/.github/CONTRIBUTING.md), convenções de commit, branch e Pull Request.
- [CODE_OF_CONDUCT.md](https://github.com/Solierrr/.github/blob/main/CODE_OF_CONDUCT.md), código de conduta.
- [SECURITY.md](https://github.com/Solierrr/.github/blob/main/SECURITY.md), como reportar uma vulnerabilidade.
