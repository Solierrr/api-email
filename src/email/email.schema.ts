import { z } from "zod";
import type { EmailConfig } from "../config/config.js";

const label = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[^\u0000-\u001f\u007f]+$/);
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
] as const;

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
      modelImageUrl: z
        .url()
        .max(2048)
        .refine((value) => {
          if (!URL.canParse(value)) return false;
          const url = new URL(value);
          return url.protocol === "https:" && !url.username && !url.password;
        })
        .optional(),
      reason: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .regex(/^[^\u0000-\u001f\u007f]+$/)
        .optional(),
      actionUrl: z.url().max(2048).optional(),
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
        message: "Company name is required",
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
        message: "Project, role and invitation expiry are required",
      });
    if (value.template !== "user-deletion" && !value.data.actionUrl)
      context.addIssue({
        code: "custom",
        path: ["data", "actionUrl"],
        message: "Action URL is required",
      });
    if (value.template === "solar-model-approved" && !value.data.modelName)
      context.addIssue({
        code: "custom",
        path: ["data", "modelName"],
        message: "Model name is required",
      });
    if (value.template === "registration-rejected" && !value.data.reason)
      context.addIssue({
        code: "custom",
        path: ["data", "reason"],
        message: "Rejection reason is required",
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
