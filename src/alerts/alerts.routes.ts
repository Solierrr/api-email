import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { EmailConfig } from "../config/config.js";
import type { EmailTransport } from "../email/email.service.js";
import { problemResponse, toJsonSchema } from "../http/openapi.js";
import { sendProblem } from "../http/problem.js";
import { serviceKeyGuard } from "../http/service-key.js";
import { renderAlertEmail, sendAlertEmail } from "./alert-email.service.js";
import {
  ticketDescription,
  ticketSummary,
  whatsappParameters,
} from "./alerts.content.js";
import { toIncident, type Incident } from "./alerts.model.js";
import { grafanaWebhookSchema } from "./alerts.schema.js";
import { createIncidentService } from "./incident.service.js";
import { createJiraClient, type JiraClient } from "./jira.client.js";
import {
  createWhatsAppClient,
  type WhatsAppClient,
} from "./whatsapp.client.js";

export interface AlertDependencies {
  jira?: JiraClient;
  whatsapp?: WhatsAppClient;
}

export function createAlertDependencies(
  config: EmailConfig,
): AlertDependencies {
  return {
    jira: config.alerts.jira ? createJiraClient(config.alerts.jira) : undefined,
    whatsapp: config.alerts.whatsapp
      ? createWhatsAppClient(config.alerts.whatsapp)
      : undefined,
  };
}

const ALERTS_BODY_LIMIT = 262144;

const sentSchema = z
  .object({
    status: z.literal("accepted"),
    sent: z.number().int().meta({ example: 2 }),
    failed: z.number().int().meta({ example: 0 }),
  })
  .meta({ id: "AlertsAccepted" });
const jiraResultSchema = z.object({
  results: z.array(
    z.object({
      alertId: z.string().meta({ example: "A03" }),
      service: z.string().meta({ example: "core" }),
      action: z.enum([
        "created",
        "skipped_interval",
        "ceiling_comment",
        "ignored_env",
        "end_recorded",
        "no_open_ticket",
      ]),
      issueKey: z.string().optional().meta({ example: "INC-12" }),
      issueKeys: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    }),
  ),
});
const jiraPreviewSchema = z.object({
  tickets: z.array(
    z.object({
      alertId: z.string(),
      service: z.string(),
      action: z.enum(["would_create", "would_record_end", "ignored_env"]),
      summary: z.string().optional(),
      priority: z.string().optional(),
      labels: z.array(z.string()).optional(),
      description: z.unknown().optional(),
    }),
  ),
});
const emailPreviewSchema = z.object({
  emails: z.array(
    z.object({ subject: z.string(), html: z.string(), text: z.string() }),
  ),
});
const whatsappPreviewSchema = z.object({
  messages: z.array(
    z.object({
      template: z.string(),
      language: z.string(),
      parameters: z.array(z.string()),
    }),
  ),
});

const channels = {
  jira: {
    summary: "Cria e liga os tickets do Jira",
    description:
      "Para cada alerta do ambiente configurado: `firing` cria um ticket novo (no mínimo 30 minutos depois do anterior do mesmo alerta, serviço e ambiente, e no máximo 8 em 24 horas), liga ao anterior e à escalada; `resolved` só grava o fim do incidente, sem mudar o status. Responde 503 JIRA_REQUEST_FAILED para o Grafana tentar de novo.",
    response: jiraResultSchema,
    previewResponse: jiraPreviewSchema,
    failure: "JIRA_REQUEST_FAILED: o Jira recusou ou não respondeu",
  },
  email: {
    summary: "Envia o e-mail do alerta à equipe",
    description:
      "Renderiza um e-mail com o layout da Solaria por alerta e envia a cada endereço de ALERT_EMAIL_TO. Alertas `resolved` também são enviados, marcados no assunto. Sem fila nem idempotência: repetir pode duplicar o e-mail.",
    response: sentSchema,
    previewResponse: emailPreviewSchema,
    failure: "EMAIL_SEND_FAILED: nenhum endereço aceitou a mensagem",
  },
  whatsapp: {
    summary: "Envia a mensagem de WhatsApp do alerta",
    description:
      "Envia o template aprovado na Meta a cada número de WHATSAPP_ALERT_TO. Só alertas `firing` do ambiente configurado; `resolved` é ignorado.",
    response: sentSchema,
    previewResponse: whatsappPreviewSchema,
    failure: "WHATSAPP_SEND_FAILED: nenhum número aceitou a mensagem",
  },
} as const;
type Channel = keyof typeof channels;

function routeSchema(channel: Channel, preview: boolean) {
  const info = channels[channel];
  const failureCode = info.failure.split(":")[0]!;
  return {
    tags: ["Alertas"],
    summary: preview ? `Prévia: ${info.summary.toLowerCase()}` : info.summary,
    description: preview
      ? "Mostra o que seria enviado, sem contato com o Jira, o SMTP nem o WhatsApp. Funciona mesmo sem as chaves do canal."
      : info.description,
    operationId: `${preview ? "preview" : "send"}Alert${channel[0]!.toUpperCase()}${channel.slice(1)}`,
    "x-error-codes": [
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "VALIDATION_FAILED",
      "MALFORMED_REQUEST",
      "PAYLOAD_TOO_LARGE",
      "UNSUPPORTED_MEDIA_TYPE",
      ...(preview ? [] : ["CHANNEL_NOT_CONFIGURED", failureCode]),
      "INTERNAL_ERROR",
    ],
    body: { $ref: "GrafanaWebhook#" },
    response: {
      200: {
        description: preview ? "Prévia gerada" : "Alertas processados",
        ...(!preview && info.response === sentSchema
          ? {
              content: {
                "application/json": { schema: { $ref: "AlertsAccepted#" } },
              },
            }
          : toJsonSchema(
              preview ? info.previewResponse : info.response,
              "output",
            )),
      },
      401: problemResponse(
        "UNAUTHENTICATED: chave de serviço ausente ou inválida",
      ),
      403: problemResponse("FORBIDDEN: só o Grafana acessa estas rotas"),
      413: problemResponse("PAYLOAD_TOO_LARGE: corpo maior que 256 KiB"),
      415: problemResponse("UNSUPPORTED_MEDIA_TYPE: corpo que não é JSON"),
      422: problemResponse(
        "VALIDATION_FAILED: payload inválido (detalhes em errors); MALFORMED_REQUEST: JSON ilegível",
      ),
      ...(preview
        ? {}
        : {
            503: problemResponse(
              `CHANNEL_NOT_CONFIGURED: canal sem chaves; ${info.failure}`,
            ),
          }),
      500: problemResponse("INTERNAL_ERROR: erro interno inesperado"),
    },
  };
}

export function registerAlertRoutes(
  app: FastifyInstance,
  config: EmailConfig,
  transport: EmailTransport,
  deps: AlertDependencies,
) {
  const requireCaller = serviceKeyGuard(config);
  const { alerts } = config;
  const incidentService =
    deps.jira && alerts.jira
      ? createIncidentService(deps.jira, alerts)
      : undefined;

  function parseIncidents(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Incident[] | undefined {
    const parsed = grafanaWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      sendProblem(
        request,
        reply,
        422,
        "VALIDATION_FAILED",
        "Erro de validação nos campos da requisição.",
        parsed.error.issues.map((issue) => ({
          field: issue.path.join(".") || "body",
          errorCode: "VALIDATION_FAILED",
          detail: issue.message,
        })),
      );
      return undefined;
    }
    const now = new Date();
    return parsed.data.alerts.map((alert) => toIncident(alert, alerts, now));
  }

  const notConfigured = (request: FastifyRequest, reply: FastifyReply) =>
    sendProblem(
      request,
      reply,
      503,
      "CHANNEL_NOT_CONFIGURED",
      "Este canal de alertas não está configurado no serviço.",
    );
  const inEnvironment = (incidents: Incident[]) =>
    incidents.filter((incident) => incident.environment === alerts.environment);

  const handlers: Record<
    Channel,
    {
      send: (
        request: FastifyRequest,
        reply: FastifyReply,
        incidents: Incident[],
      ) => Promise<unknown>;
      preview: (incidents: Incident[]) => Promise<unknown>;
    }
  > = {
    jira: {
      async send(request, reply, incidents) {
        if (!incidentService) return notConfigured(request, reply);
        const results = [];
        try {
          for (const incident of incidents)
            results.push(await incidentService.handle(incident));
        } catch (error) {
          request.log.error(
            {
              code: "JIRA_REQUEST_FAILED",
              operation: (error as { operation?: string }).operation,
              status: (error as { status?: number }).status,
            },
            "Jira request failed",
          );
          return sendProblem(
            request,
            reply,
            503,
            "JIRA_REQUEST_FAILED",
            "O Jira recusou ou não respondeu à requisição.",
          );
        }
        request.log.info(
          { actions: results.map((result) => result.action) },
          "Alerts handled for Jira",
        );
        return { results };
      },
      async preview(incidents) {
        return {
          tickets: incidents.map((incident) => {
            const base = {
              alertId: incident.alertId,
              service: incident.service,
            };
            if (incident.environment !== alerts.environment)
              return { ...base, action: "ignored_env" as const };
            if (!incident.firing)
              return { ...base, action: "would_record_end" as const };
            return {
              ...base,
              action: "would_create" as const,
              summary: ticketSummary(incident),
              priority: incident.jiraPriority,
              labels: incident.tags,
              description: ticketDescription(incident, { occurrence: 1 }),
            };
          }),
        };
      },
    },
    email: {
      async send(request, reply, incidents) {
        if (!alerts.emailTo.length) return notConfigured(request, reply);
        const { sent, failed } = await sendAlertEmail(
          inEnvironment(incidents),
          alerts.emailTo,
          config.EMAIL_FROM,
          transport,
        );
        request.log.info({ sent, failed }, "Alert e-mails sent");
        if (!sent && failed)
          return sendProblem(
            request,
            reply,
            503,
            "EMAIL_SEND_FAILED",
            "Nenhum endereço aceitou a mensagem.",
          );
        return { status: "accepted" as const, sent, failed };
      },
      async preview(incidents) {
        return {
          emails: await Promise.all(
            inEnvironment(incidents).map((incident) =>
              renderAlertEmail(incident),
            ),
          ),
        };
      },
    },
    whatsapp: {
      async send(request, reply, incidents) {
        const whatsapp = alerts.whatsapp;
        if (!deps.whatsapp || !whatsapp) return notConfigured(request, reply);
        let sent = 0;
        let failed = 0;
        for (const incident of inEnvironment(incidents)) {
          if (!incident.firing) continue;
          for (const to of whatsapp.to) {
            try {
              await deps.whatsapp.send(to, whatsappParameters(incident));
              sent += 1;
            } catch {
              failed += 1;
            }
          }
        }
        request.log.info({ sent, failed }, "Alert WhatsApp messages sent");
        if (!sent && failed)
          return sendProblem(
            request,
            reply,
            503,
            "WHATSAPP_SEND_FAILED",
            "Nenhum número aceitou a mensagem.",
          );
        return { status: "accepted" as const, sent, failed };
      },
      async preview(incidents) {
        return {
          messages: inEnvironment(incidents)
            .filter((incident) => incident.firing)
            .map((incident) => ({
              template: alerts.whatsapp?.templateName ?? "(não configurado)",
              language: alerts.whatsapp?.templateLanguage ?? "pt_BR",
              parameters: whatsappParameters(incident),
            })),
        };
      },
    },
  };

  for (const channel of Object.keys(channels) as Channel[]) {
    for (const preview of [false, true]) {
      app.post(
        preview ? `/alerts/${channel}/preview` : `/alerts/${channel}`,
        {
          onRequest: requireCaller("grafana"),
          bodyLimit: ALERTS_BODY_LIMIT,
          schema: routeSchema(channel, preview),
        },
        async (request, reply) => {
          const incidents = parseIncidents(request, reply);
          if (!incidents) return reply;
          return preview
            ? handlers[channel].preview(incidents)
            : handlers[channel].send(request, reply, incidents);
        },
      );
    }
  }
}
