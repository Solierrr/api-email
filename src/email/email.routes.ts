import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { EmailConfig } from "../config/config.js";
import { emailSchema, isAllowedActionUrl } from "./email.schema.js";
import {
  renderEmail,
  sendEmail,
  type EmailTransport,
} from "./email.service.js";

export function registerEmailRoutes(
  app: FastifyInstance,
  config: EmailConfig,
  transport: EmailTransport,
) {
  const expected = createHash("sha256").update(config.EMAIL_API_KEY).digest();
  async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const key = request.headers["x-api-key"];
    if (
      typeof key !== "string" ||
      !timingSafeEqual(createHash("sha256").update(key).digest(), expected)
    ) {
      return reply
        .code(401)
        .send({ code: "UNAUTHORIZED", requestId: request.id });
    }
  }
  const options = { onRequest: authenticate };
  for (const preview of [false, true]) {
    app.post(
      preview ? "/emails/preview" : "/emails",
      options,
      async (request, reply) => {
        const parsed = emailSchema.safeParse(request.body);
        if (!parsed.success)
          return reply.code(400).send({
            code: "INVALID_REQUEST",
            fields: parsed.error.issues.map((issue) => issue.path.join(".")),
            requestId: request.id,
          });
        if (
          parsed.data.data.actionUrl &&
          !isAllowedActionUrl(parsed.data.data.actionUrl, config)
        )
          return reply
            .code(400)
            .send({ code: "INVALID_ACTION_URL", requestId: request.id });
        if (preview) return renderEmail(parsed.data);
        try {
          const result = await sendEmail(
            parsed.data,
            config.EMAIL_FROM,
            transport,
          );
          request.log.info(
            { template: parsed.data.template, messageId: result.messageId },
            "Email accepted by SMTP",
          );
          return result;
        } catch {
          request.log.error({ code: "EMAIL_SEND_FAILED" }, "Email send failed");
          return reply
            .code(503)
            .send({ code: "EMAIL_SEND_FAILED", requestId: request.id });
        }
      },
    );
  }
}
