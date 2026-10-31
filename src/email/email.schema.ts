import { z } from "zod";
import type { EmailConfig } from "../config/config.js";

z.config(z.locales.pt());

const label = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[^\u0000-\u001f\u007f]+$/);
// O cliente de e-mail baixa a imagem, então só https, sem usuário nem senha na URL
const httpsImage = z
  .url()
  .max(2048)
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  });
export const emailTemplates = [
  "email-verification",
  "password-reset",
  "company-invitation",
  "project-invitation",
  "user-deletion",
  "registration-approved",
  "registration-rejected",
  "solar-model-approved",
  "company-email-verification",
  "operational-alert",
] as const;

export const alertPriorities = ["P1", "P2", "P3", "P4", "P5"] as const;

const singleLine = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^\u0000-\u001f\u007f]+$/);

export const emailSchema = z
  .strictObject({
    template: z.enum(emailTemplates),
    locale: z.enum(["pt-BR", "en-US", "es-ES"]).default("pt-BR"),
    to: z.email().max(320),
    data: z.strictObject({
      name: label.optional(),
      companyName: label.optional(),
      projectName: z
        .string()
        .trim()
        .min(1)
        .max(160)
        .regex(/^[^\u0000-\u001f\u007f]+$/)
        .optional(),
      projectRole: z.enum(["MANAGER", "MEMBER", "VIEWER"]).optional(),
      invitationExpiresAt: z.iso.datetime({ offset: true }).optional(),
      modelName: label.optional(),
      modelManufacturer: label.optional(),
      modelPowerWatts: z.number().int().positive().max(10000).optional(),
      modelImageUrl: httpsImage.optional(),
      companyLogoUrl: httpsImage.optional(),
      reason: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .regex(/^[^\u0000-\u001f\u007f]+$/)
        .optional(),
      actionUrl: z.url().max(2048).optional(),
      // Aviso operacional (template operational-alert): o texto já vem pronto de quem manda
      alertPriority: z.enum(alertPriorities).optional(),
      alertStatus: z.enum(["firing", "resolved"]).optional(),
      serviceName: label.optional(),
      environment: label.optional(),
      summary: singleLine.max(300).optional(),
      impact: singleLine.max(400).optional(),
      firstSteps: z.array(singleLine.max(240)).max(6).optional(),
      startedAt: z.iso.datetime({ offset: true }).optional(),
      endedAt: z.iso.datetime({ offset: true }).optional(),
    }),
  })
  .superRefine((value, context) => {
    if (
      ["company-invitation", "company-email-verification"].includes(
        value.template,
      ) &&
      !value.data.companyName
    )
      context.addIssue({
        code: "custom",
        path: ["data", "companyName"],
        message: "O nome da empresa é obrigatório.",
      });
    if (
      value.template === "project-invitation" &&
      (!value.data.projectName ||
        !value.data.projectRole ||
        !value.data.invitationExpiresAt)
    )
      context.addIssue({
        code: "custom",
        path: ["data", "projectName"],
        message: "Projeto, papel e validade do convite são obrigatórios.",
      });
    if (value.template !== "user-deletion" && !value.data.actionUrl)
      context.addIssue({
        code: "custom",
        path: ["data", "actionUrl"],
        message: "O link de ação é obrigatório.",
      });
    if (value.template === "solar-model-approved" && !value.data.modelName)
      context.addIssue({
        code: "custom",
        path: ["data", "modelName"],
        message: "O nome do modelo é obrigatório.",
      });
    if (value.template === "operational-alert") {
      for (const field of [
        "alertPriority",
        "alertStatus",
        "serviceName",
        "environment",
        "summary",
        "startedAt",
      ] as const)
        if (!value.data[field])
          context.addIssue({
            code: "custom",
            path: ["data", field],
            message: "Campo obrigatório no aviso operacional.",
          });
    }
    if (value.template === "registration-rejected" && !value.data.reason)
      context.addIssue({
        code: "custom",
        path: ["data", "reason"],
        message: "O motivo da reprovação é obrigatório.",
      });
  });

export type EmailRequest = z.infer<typeof emailSchema>;
export type EmailTemplate = EmailRequest["template"];
export type EmailLocale = EmailRequest["locale"];

export function isAllowedActionUrl(
  value: string,
  config: EmailConfig,
): boolean {
  const url = new URL(value);
  return (
    config.allowedOrigins.includes(url.origin) &&
    !url.username &&
    !url.password &&
    (url.protocol === "https:" ||
      (config.APP_ENV === "dev" && url.protocol === "http:"))
  );
}
