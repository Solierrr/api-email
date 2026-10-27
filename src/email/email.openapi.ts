import type { OpenAPIV3 } from "openapi-types";
import { z } from "zod";
import { emailSchema } from "./email.schema.js";

const { $schema: _schema, ...requestSchema } = z.toJSONSchema(emailSchema, {
  target: "openapi-3.0",
  io: "input",
});

const example = {
  template: "email-verification",
  locale: "pt-BR",
  to: "seu-email@example.com",
  data: {
    name: "Teste Solaria",
    actionUrl:
      "https://solarianetwork.site/pt-BR/verificar-email?token=exemplo",
  },
};

function operation(preview: boolean): OpenAPIV3.OperationObject {
  return {
    operationId: preview ? "previewEmail" : "sendEmail",
    tags: ["Emails"],
    summary: preview ? "Visualizar um template sem enviar" : "Enviar um e-mail",
    description: preview
      ? "Renderiza o template Solaria e retorna assunto, HTML e texto, sem enviar e-mail."
      : "Envia um e-mail real ao destinatário informado. accepted significa aceite pelo provedor, não confirmação de entrega. Não repetir automaticamente após timeout.",
    security: [{ ServiceKey: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/EmailRequest" },
          example,
        },
      },
    },
    responses: {
      "200": {
        description: preview
          ? "Template renderizado"
          : "E-mail aceito pelo provedor",
        content: {
          "application/json": {
            schema: preview
              ? {
                  type: "object",
                  properties: {
                    subject: { type: "string" },
                    html: { type: "string" },
                    text: { type: "string" },
                  },
                  required: ["subject", "html", "text"],
                }
              : {
                  type: "object",
                  properties: {
                    status: { type: "string", enum: ["accepted"] },
                    messageId: { type: "string" },
                  },
                  required: ["status", "messageId"],
                },
          },
        },
      },
      "400": {
        description:
          "Payload inválido ou actionUrl fora das origens permitidas",
      },
      "401": { description: "Chave interna ausente ou inválida" },
      "413": { description: "Corpo excede 16 KiB" },
      "503": { description: "Provedor de envio indisponível" },
    },
  };
}

export const emailApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "Solaria — API de e-mails",
    version: "0.2.0",
    description:
      "Templates reutilizáveis da Solaria. Use Authorize com a chave interna EMAIL_API_KEY (ou SERVICE_KEY_API_EMAIL), não a chave do Brevo. Cada template tem requisitos próprios: actionUrl é obrigatório exceto em user-deletion; convites corporativos exigem companyName; project-invitation exige projectName, projectRole e invitationExpiresAt; solar-model-approved exige modelName; registration-rejected exige reason. Links precisam pertencer a EMAIL_ALLOWED_ORIGINS.",
  },
  components: {
    securitySchemes: {
      ServiceKey: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
    schemas: { EmailRequest: requestSchema as OpenAPIV3.SchemaObject },
  },
  paths: {
    "/health": {
      get: {
        summary: "Verificar processo HTTP",
        responses: { "200": { description: "Processo disponível" } },
      },
    },
    "/ready": {
      get: {
        summary: "Verificar acesso ao provedor",
        responses: {
          "200": { description: "Pronto para envio" },
          "503": { description: "Transporte indisponível" },
        },
      },
    },
    "/emails": { post: operation(false) },
    "/emails/preview": { post: operation(true) },
  },
};
