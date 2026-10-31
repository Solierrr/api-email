import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { EmailConfig } from "../config/config.js";
import { problemResponse, toJsonSchema } from "../http/openapi.js";
import { sendProblem } from "../http/problem.js";
import { serviceKeyGuard } from "../http/service-key.js";
import { emailSchema, isAllowedActionUrl } from "./email.schema.js";
import {
  renderEmail,
  sendEmail,
  type EmailTransport,
} from "./email.service.js";

const acceptedSchema = z.object({
  status: z.literal("accepted"),
  messageId: z.string().meta({ example: "<a1b2c3@solaria.local>" }),
});
const previewSchema = z.object({
  subject: z.string().meta({ example: "Confirme seu e-mail" }),
  html: z.string(),
  text: z.string(),
});

const bodyDescription =
  "Um destinatário por chamada. Campos desconhecidos são recusados. Regras por modelo: company-invitation e company-email-verification exigem data.companyName; project-invitation exige data.projectName, data.projectRole e data.invitationExpiresAt; solar-model-approved exige data.modelName; registration-rejected exige data.reason; operational-alert exige data.alertPriority, data.alertStatus, data.serviceName, data.environment, data.summary e data.startedAt; todos, menos user-deletion, exigem data.actionUrl, cuja origem precisa estar em EMAIL_ALLOWED_ORIGINS.";

function routeSchema(preview: boolean) {
  const errorCodes = [
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "VALIDATION_FAILED",
    "MALFORMED_REQUEST",
    "INVALID_ACTION_URL",
    "PAYLOAD_TOO_LARGE",
    "UNSUPPORTED_MEDIA_TYPE",
    ...(preview ? [] : ["EMAIL_SEND_FAILED"]),
    "INTERNAL_ERROR",
  ];
  return {
    tags: ["E-mails"],
    summary: preview
      ? "Renderiza um e-mail sem enviar"
      : "Renderiza e envia um e-mail",
    description: preview
      ? `Devolve assunto, HTML e texto do modelo, sem contato com o SMTP. ${bodyDescription}`
      : `Responde depois do aceite do servidor SMTP, que não é confirmação de entrega. Sem fila, retry nem idempotência: repetir após timeout pode duplicar o e-mail. ${bodyDescription}`,
    operationId: preview ? "previewEmail" : "sendEmail",
    "x-error-codes": errorCodes,
    body: {
      ...toJsonSchema(emailSchema, "input"),
      examples: [
        {
          template: "email-verification",
          locale: "pt-BR",
          to: "usuario@example.com",
          data: {
            name: "Ana",
            actionUrl:
              "https://web-app.example.com/pt-BR/verificar-email?token=exemplo",
          },
        },
      ],
    },
    response: {
      200: preview
        ? {
            description: "E-mail renderizado",
            ...toJsonSchema(previewSchema, "output"),
          }
        : {
            description: "E-mail aceito pelo servidor SMTP",
            ...toJsonSchema(acceptedSchema, "output"),
          },
      400: problemResponse(
        "INVALID_ACTION_URL: link fora das origens permitidas",
      ),
      401: problemResponse(
        "UNAUTHENTICATED: chave de serviço ausente ou inválida",
      ),
      403: problemResponse("FORBIDDEN: serviço chamador não aceito nesta rota"),
      413: problemResponse("PAYLOAD_TOO_LARGE: corpo maior que 16 KiB"),
      415: problemResponse("UNSUPPORTED_MEDIA_TYPE: corpo que não é JSON"),
      422: problemResponse(
        "VALIDATION_FAILED: corpo inválido (detalhes em errors); MALFORMED_REQUEST: JSON ilegível",
      ),
      ...(preview
        ? {}
        : {
            503: problemResponse(
              "EMAIL_SEND_FAILED: o servidor SMTP não aceitou a mensagem",
            ),
          }),
      500: problemResponse("INTERNAL_ERROR: erro interno inesperado"),
    },
  };
}

export function registerEmailRoutes(
  app: FastifyInstance,
  config: EmailConfig,
  transport: EmailTransport,
) {
  const requireCaller = serviceKeyGuard(config);
  for (const preview of [false, true]) {
    app.post(
      preview ? "/emails/preview" : "/emails",
      {
        onRequest: requireCaller("api-core", "api-auth"),
        schema: routeSchema(preview),
      },
      async (request, reply) => {
        const parsed = emailSchema.safeParse(request.body);
        if (!parsed.success)
          return sendProblem(
            request,
            reply,
            422,
            "VALIDATION_FAILED",
            "Erro de validação nos campos da requisição.",
            parsed.error.issues.map((issue) => ({
              field:
                [...issue.path, ...("keys" in issue ? issue.keys : [])].join(
                  ".",
                ) || "body",
              errorCode: "VALIDATION_FAILED",
              detail: issue.message,
            })),
          );
        if (
          parsed.data.data.actionUrl &&
          !isAllowedActionUrl(parsed.data.data.actionUrl, config)
        )
          return sendProblem(
            request,
            reply,
            400,
            "INVALID_ACTION_URL",
            "O link de ação está fora das origens permitidas.",
          );
        if (preview) return renderEmail(parsed.data);
        try {
          const result = await sendEmail(
            parsed.data,
            config.EMAIL_FROM,
            transport,
          );
          request.log.info(
            { template: parsed.data.template, messageId: result.messageId },
            "Email accepted by provider",
          );
          return result;
        } catch {
          request.log.error({ code: "EMAIL_SEND_FAILED" }, "Email send failed");
          return sendProblem(
            request,
            reply,
            503,
            "EMAIL_SEND_FAILED",
            "O servidor SMTP não aceitou a mensagem.",
          );
        }
      },
    );
  }
}
