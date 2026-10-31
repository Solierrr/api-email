# Mocks

Exemplos usados só no desenvolvimento local. Nada aqui entra na imagem Docker.

## `emails/`

Um JSON por chamada de `POST /emails`, um para cada modelo. O `npm run preview:seed` valida todos em `POST /emails/preview` e depois envia cada um para o Mailpit local (http://localhost:8025). Os tokens e endereços são fictícios.

## `images/`

Poucas imagens, só as que os modelos mostram, copiadas do [`mocks-warehouse`](https://github.com/Solierrr/mocks-warehouse) sem alteração.

| Arquivo       | Origem no `mocks-warehouse`                                        | ID no catálogo                   | Uso                                                                                            |
| ------------- | ------------------------------------------------------------------ | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `R9XADX.webp` | `images/products/solar-panels/hero/R9XADX.webp` (commit `9bd616f`) | `solar-panels-f2b8091a5514`      | imagem do modelo em `emails/solar-model-approved.json`                                         |
| `ZOBB69.webp` | `images/enterprises/pfp/ZOBB69.webp` (commit `4772022`)            | `enterprises-logos-54b4ae9664e9` | logo da empresa em `emails/company-invitation.json` e `emails/company-email-verification.json` |

O contrato aceita em `data.modelImageUrl` só URLs `https` (o cliente de e-mail baixa a imagem), então a prévia aponta para a cópia desse mesmo arquivo no Cloudinary da Solaria (`mocks/<ID do catálogo>`), enviada pelo próprio `mocks-warehouse`. O arquivo local é a referência versionada da imagem usada; para trocar, copie outra imagem do `mocks-warehouse`, atualize a tabela e a URL da prévia.

Os modelos de empresa mostram a logo da empresa em `data.companyLogoUrl` (mesma regra de URL `https`, apontando para a cópia do Cloudinary); sem logo, o nome da empresa vai como texto. Os outros modelos não exibem imagem.
