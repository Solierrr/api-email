import Fastify from "fastify";
import type { EmailConfig } from "./config/config.js";
import { createSmtpTransport } from "./config/smtp.js";
import { createBrevoTransport } from "./config/brevo.js";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { emailApiDocument } from "./email/email.openapi.js";
import { registerEmailRoutes } from "./email/email.routes.js";
import type { EmailTransport } from "./email/email.service.js";

export function buildApp(
  config: EmailConfig,
  transport: EmailTransport = config.EMAIL_TRANSPORT === "brevo"
    ? createBrevoTransport(config)
    : createSmtpTransport(config),
  logging = true,
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
  app.register(swagger, {
    mode: "static",
    specification: { document: emailApiDocument },
  });
  app.register(swaggerUi, {
    routePrefix: "/docs",
    staticCSP: true,
    uiConfig: { persistAuthorization: false, validatorUrl: null },
  });
  app.get("/openapi.json", async () => emailApiDocument);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await transport.verify();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  registerEmailRoutes(app, config, transport);
  app.setErrorHandler((error, request, reply) => {
    const code =
      error instanceof Error &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : 500;
    const status = code >= 400 && code < 500 ? code : 500;
    request.log.error({ code: "REQUEST_FAILED" }, "Request failed");
    void reply.code(status).send({
      code: status === 500 ? "INTERNAL_ERROR" : "INVALID_REQUEST",
      requestId: request.id,
    });
  });
  app.addHook("onClose", async () => transport.close());
  return app;
}
