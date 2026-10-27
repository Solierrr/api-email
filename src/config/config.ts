import { z } from "zod";

const boolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["dev", "qa", "prod"]),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8083),
  EMAIL_API_KEY: z.string().min(32).max(256),
  EMAIL_FROM: z.email(),
  EMAIL_ALLOWED_ORIGINS: z.string().min(1),
  EMAIL_TRANSPORT: z.enum(["smtp", "brevo"]).default("smtp"),
  BREVO_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: boolean.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse({
    ...env,
    EMAIL_API_KEY: env.EMAIL_API_KEY ?? env.SERVICE_KEY_API_EMAIL,
    APP_ENV: env.APP_ENV ?? (env.NODE_ENV === "production" ? "prod" : "dev"),
  });
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
    ].join(", ");
    throw new Error(`Invalid configuration: ${fields}`);
  }
  const config = parsed.data;
  if (config.EMAIL_TRANSPORT === "brevo" && !config.BREVO_API_KEY)
    throw new Error("Invalid configuration: BREVO_API_KEY");
  if (config.EMAIL_TRANSPORT === "smtp" && !config.SMTP_HOST)
    throw new Error("Invalid configuration: SMTP_HOST");
  if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD))
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together");
  const allowedOrigins = config.EMAIL_ALLOWED_ORIGINS.split(",").map((value) =>
    value.trim(),
  );
  for (const origin of allowedOrigins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("Invalid EMAIL_ALLOWED_ORIGINS");
    }
    if (
      url.origin !== origin ||
      !["http:", "https:"].includes(url.protocol) ||
      (config.APP_ENV !== "dev" && url.protocol !== "https:")
    )
      throw new Error("Invalid EMAIL_ALLOWED_ORIGINS");
  }
  return { ...config, allowedOrigins };
}

export type EmailConfig = ReturnType<typeof readConfig>;
