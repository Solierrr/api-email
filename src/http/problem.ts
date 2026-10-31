import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export const problemContentType = "application/problem+json";

export const problemFieldErrorSchema = z
  .object({
    field: z.string().meta({ example: "data.actionUrl" }),
    errorCode: z.string().meta({ example: "VALIDATION_FAILED" }),
    detail: z.string().meta({ example: "Campo obrigatório" }),
  })
  .meta({ id: "ProblemFieldError" });

export const problemDetailSchema = z
  .object({
    type: z.string().meta({ example: "about:blank" }),
    title: z.string().meta({ example: "EMAIL_SEND_FAILED" }),
    status: z.number().int().min(100).max(599).meta({ example: 503 }),
    errorCode: z.string().meta({ example: "EMAIL_SEND_FAILED" }),
    detail: z
      .string()
      .meta({ example: "O servidor SMTP não aceitou a mensagem." }),
    instance: z.string().meta({ example: "/emails" }),
    timestamp: z
      .string()
      .meta({ format: "date-time", example: "2026-10-25T13:45:00.000Z" }),
    requestId: z
      .string()
      .optional()
      .meta({ description: "Id da requisição nos logs do serviço." }),
    errors: z.array(problemFieldErrorSchema).optional(),
  })
  .meta({ id: "ProblemDetail" });

export type ProblemFieldError = z.infer<typeof problemFieldErrorSchema>;

export function problem(
  request: FastifyRequest,
  status: number,
  errorCode: string,
  detail: string,
  errors?: ProblemFieldError[],
) {
  return {
    type: "about:blank",
    title: errorCode,
    status,
    errorCode,
    detail,
    instance: request.url.split("?")[0] ?? request.url,
    timestamp: new Date().toISOString(),
    requestId: request.id,
    ...(errors ? { errors } : {}),
  };
}

export function sendProblem(
  request: FastifyRequest,
  reply: FastifyReply,
  status: number,
  errorCode: string,
  detail: string,
  errors?: ProblemFieldError[],
) {
  return reply
    .code(status)
    .type(problemContentType)
    .send(problem(request, status, errorCode, detail, errors));
}
