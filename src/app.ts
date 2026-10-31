import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import { z } from "zod";
import type { EmailConfig } from "./config/config.js";
import { createBrevoTransport } from "./config/brevo.js";
import { createSmtpTransport } from "./config/smtp.js";
import {
  createAlertDependencies,
  registerAlertRoutes,
  type AlertDependencies,
} from "./alerts/alerts.routes.js";
import { registerEmailRoutes } from "./email/email.routes.js";
import type { EmailTransport } from "./email/email.service.js";
import {
  problemResponse,
  registerOpenApi,
  serviceVersion,
  toJsonSchema,
} from "./http/openapi.js";
import { sendProblem } from "./http/problem.js";

const READY_TIMEOUT_MS = 2000;

const healthSchema = z.object({
  status: z.literal("UP"),
  version: z.string().meta({ example: "0.2.0" }),
});
const readySchema = z.object({ status: z.enum(["UP", "DOWN"]) });

const genericByStatus: Record<number, string> = {
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  406: "NOT_ACCEPTABLE",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  429: "RATE_LIMITED",
};

export async function buildApp(
  config: EmailConfig,
  transport: EmailTransport = config.EMAIL_TRANSPORT === "brevo"
    ? createBrevoTransport(config)
    : createSmtpTransport(config),
  logging = true,
  alertDependencies: AlertDependencies = createAlertDependencies(config),
) {
  const app = Fastify({
    bodyLimit: 16384,
    logger: logging
      ? {
          redact: ["req.headers", "headers", "body"],
          serializers: {
            req: (request) => ({
              method: request.method,
              url: request.url.split("?")[0],
            }),
          },
        }
      : false,
  });
  // Route schemas only document the contract: zod validates the body and responses are plain JSON
  app.setValidatorCompiler(() => (value) => ({ value }));
  app.setSerializerCompiler(() => (value) => JSON.stringify(value));
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status =
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
        ? error.statusCode
        : 500;
    if (status === 500) {
      request.log.error({ code: "INTERNAL_ERROR" }, "Request failed");
      return sendProblem(
        request,
        reply,
        500,
        "INTERNAL_ERROR",
        "Ocorreu um erro interno inesperado.",
      );
    }
    if (status === 400)
      return sendProblem(
        request,
        reply,
        422,
        "MALFORMED_REQUEST",
        "Corpo da requisição ilegível.",
      );
    return sendProblem(
      request,
      reply,
      status,
      genericByStatus[status] ?? "VALIDATION_FAILED",
      "Requisição recusada.",
    );
  });
  app.setNotFoundHandler((request, reply) =>
    sendProblem(request, reply, 404, "NOT_FOUND", "Rota não encontrada."),
  );
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Service-Key"],
  });
  await registerOpenApi(app, config.DOCS_ENABLED);

  app.get(
    "/health",
    {
      schema: {
        tags: ["Saúde"],
        summary: "Indica se o processo está vivo",
        description:
          "Não consulta dependências; traz a versão do serviço (a do package.json).",
        operationId: "getHealth",
        security: [],
        response: {
          200: {
            description: "Processo no ar",
            ...toJsonSchema(healthSchema, "output"),
          },
          500: problemResponse("Erro interno inesperado"),
        },
      },
    },
    async () => ({ status: "UP" as const, version: serviceVersion }),
  );
  app.get(
    "/ready",
    {
      schema: {
        tags: ["Saúde"],
        summary: "Indica se o serviço está pronto para atender",
        description:
          "Pronto quando o servidor SMTP aceita conexão e autenticação em até 2 segundos.",
        operationId: "getReady",
        security: [],
        response: {
          200: {
            description: "SMTP acessível",
            ...toJsonSchema(readySchema, "output"),
          },
          503: {
            description: "SMTP inacessível",
            ...toJsonSchema(readySchema, "output"),
          },
          500: problemResponse("Erro interno inesperado"),
        },
      },
    },
    async (_request, reply) => {
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          transport.verify(),
          new Promise((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error("timeout")),
              READY_TIMEOUT_MS,
            );
          }),
        ]);
        return { status: "UP" as const };
      } catch {
        return reply.code(503).send({ status: "DOWN" as const });
      } finally {
        clearTimeout(timer);
      }
    },
  );
  registerEmailRoutes(app, config, transport);
  registerAlertRoutes(app, config, transport, alertDependencies);
  app.addHook("onClose", async () => transport.close());
  return app;
}
