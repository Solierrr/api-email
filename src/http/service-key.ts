import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { EmailConfig } from "../config/config.js";
import { sendProblem } from "./problem.js";

export type ServiceCaller = keyof EmailConfig["serviceKeys"];

const digest = (value: string) => createHash("sha256").update(value).digest();

export function serviceKeyGuard(config: EmailConfig) {
  const callers = Object.entries(config.serviceKeys).flatMap(([caller, key]) =>
    key ? [[caller as ServiceCaller, digest(key)] as const] : [],
  );
  // Transitional: accepts the legacy X-API-Key as api-core until it sends X-Service-Key
  const legacy = config.EMAIL_API_KEY
    ? digest(config.EMAIL_API_KEY)
    : undefined;

  function identify(request: FastifyRequest): ServiceCaller | undefined {
    const key = request.headers["x-service-key"];
    if (typeof key === "string") {
      const received = digest(key);
      return callers.find(([, expected]) =>
        timingSafeEqual(received, expected),
      )?.[0];
    }
    const legacyKey = request.headers["x-api-key"];
    if (legacy && typeof legacyKey === "string")
      return timingSafeEqual(digest(legacyKey), legacy)
        ? "api-core"
        : undefined;
    return undefined;
  }

  return (...allowed: ServiceCaller[]) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      const caller = identify(request);
      if (!caller)
        return sendProblem(
          request,
          reply,
          401,
          "UNAUTHENTICATED",
          "Chave de serviço ausente ou inválida.",
        );
      if (!allowed.includes(caller))
        return sendProblem(
          request,
          reply,
          403,
          "FORBIDDEN",
          "Serviço chamador não autorizado nesta rota.",
        );
    };
}
