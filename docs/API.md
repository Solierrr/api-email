<p align="center">
  <img src="../assets/readme/banners/fastify.png" alt="Fastify" width="100%">
</p>

# API de e-mails

O contrato completo está no [`openapi.yaml`](https://github.com/Solierrr/api-email/blob/main/openapi.yaml), gerado do código e conferido no CI. O [Swagger de QA](https://api-email-6swz.onrender.com/docs) e `/openapi.json` são servidos quando `DOCS_ENABLED` permite. Não há prefixo `/internal`, pois as operações de e-mail atendem somente serviços.

## Autenticação

As rotas de prévia e de envio exigem `X-Service-Key`, e os chamadores aceitos são o `api-core` e o `api-auth`, cada um com a sua chave nas variáveis `SERVICE_KEY_API_CORE` e `SERVICE_KEY_API_AUTH`, como declara o esquema `serviceKey` do contrato.

O modo de compatibilidade aceita `X-API-Key` enquanto `EMAIL_API_KEY` estiver configurado e identifica a chamada como `api-core`. A presença de uma chave nova inválida não provoca fallback para a legada. A retirada desse caminho depende da migração dos consumidores.

O serviço não oferece login por JWT, e a chave de serviço pertence ao backend que chama, por isso nunca deve ser embutida no cliente web. O padrão está em [SERVICE_AUTH.md](https://github.com/Solierrr/docs-warehouse/blob/main/docs/standards/SERVICE_AUTH.md).

## Operações

O contrato tem dois grupos de rotas.

| Grupo   | Operação               | Resultado                                                                        |
| ------- | ---------------------- | -------------------------------------------------------------------------------- |
| E-mails | `POST /emails/preview` | assunto, HTML e texto sem contato com o transporte                               |
| E-mails | `POST /emails`         | HTTP 200 com `status` igual a `accepted` e `messageId` após aceite do transporte |
| Saúde   | `GET /health`          | processo e versão, sem autenticação                                              |
| Saúde   | `GET /ready`           | verificação do transporte, sem autenticação                                      |

O estado `accepted` não comprova a entrega na caixa postal, e como o serviço não tem identificador de idempotência, histórico consultável nem nova tentativa automática, repetir o pedido depois de um timeout pode duplicar a mensagem. <!-- PENDENTE: 4 -->

## Modelos e limites

Os identificadores do contrato correspondem aos nove modelos de produto.

| Identificador                                      | Uso                                            |
| -------------------------------------------------- | ---------------------------------------------- |
| `email-verification`, `password-reset`             | confirmação de endereço e recuperação de senha |
| `company-invitation`, `company-email-verification` | convite e confirmação empresarial              |
| `project-invitation`                               | convite com projeto, papel e validade          |
| `user-deletion`                                    | aviso de exclusão, sem botão de ação           |
| `registration-approved`, `registration-rejected`   | resultado da análise de cadastro               |
| `solar-model-approved`                             | aprovação de modelo de placa                   |

O corpo aceita um destinatário e usa `pt-BR` como idioma padrão. Também aceita `en-US` e `es-ES`. Nome e contexto adicional são validados pelo modelo escolhido. Os campos obrigatórios por modelo estão no contrato gerado, sem necessidade de enviar HTML, assunto ou remetente.

O corpo tem limite de 16 KiB e campos desconhecidos são recusados, e o `actionUrl` precisa ter uma origem exata da lista autorizada, sem credenciais, com HTTPS obrigatório fora do desenvolvimento. A imagem opcional do modelo aceita HTTPS sem credenciais, mas não segue a restrição de origens do link de ação, e o servidor nunca busca essa imagem.

## Exemplo de prévia

Este exemplo usa dados de demonstração e uma origem local que precisa estar autorizada na configuração.

```http
POST /emails/preview HTTP/1.1
Host: localhost:8083
X-Service-Key: <chave do chamador>
Content-Type: application/json

{
  "template": "email-verification",
  "locale": "pt-BR",
  "to": "usuario@example.com",
  "data": {
    "name": "Pessoa de exemplo",
    "actionUrl": "http://localhost:5173/pt-BR/verificar-email?token=exemplo"
  }
}
```

A resposta 200 traz `subject`, `html` e `text`, e para enviar a mesma mensagem basta repetir o corpo em `POST /emails`. Em desenvolvimento, configure antes o Mailpit para capturar o envio, como mostra o passo a passo em [RUNNING.md](./RUNNING.md).

## Erros

Os erros HTTP usam `application/problem+json`, com `errorCode`, `timestamp` e `requestId`, conforme o [contrato de erro](https://github.com/Solierrr/docs-warehouse/blob/main/docs/standards/ERRORS.md). `errors` aparece em validação. O [catálogo central](https://github.com/Solierrr/docs-warehouse/blob/main/docs/standards/ERROR_CODES.md) descreve os códigos compartilhados e os específicos do serviço.

| Status e código                                | Quando ocorre                                           |
| ---------------------------------------------- | ------------------------------------------------------- |
| 400 `INVALID_ACTION_URL`                       | link fora das origens ou protocolos permitidos          |
| 401 `UNAUTHENTICATED`                          | chave ausente ou inválida                               |
| 403 `FORBIDDEN`                                | chamador reconhecido, mas não autorizado pela rota      |
| 413 `PAYLOAD_TOO_LARGE`                        | corpo acima do limite                                   |
| 415 `UNSUPPORTED_MEDIA_TYPE`                   | conteúdo em formato não aceito                          |
| 422 `VALIDATION_FAILED` ou `MALFORMED_REQUEST` | corpo inválido ou JSON ilegível                         |
| 503 `EMAIL_SEND_FAILED`                        | falha durante renderização ou envio no caminho de envio |
| 500 `INTERNAL_ERROR`                           | falha inesperada não convertida pela rota               |

O 503 de `/ready` é JSON com `status` igual a `DOWN`, sem o envelope de erro. O código `PAYLOAD_TOO_LARGE` já está no contrato deste serviço, mas ainda não consta no catálogo central analisado. Isso está registrado em [STATUS.md](./STATUS.md).
