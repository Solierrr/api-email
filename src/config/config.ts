import { z } from "zod";

const boolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const serviceKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(32).max(256).optional(),
);
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_ENV: z.enum(["dev", "qa", "prod"]),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8083),
  SERVICE_KEY_API_CORE: serviceKey,
  SERVICE_KEY_API_AUTH: serviceKey,
  EMAIL_API_KEY: serviceKey,
  DOCS_ENABLED: boolean.default(true),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:3000,http://localhost:5173"),
  EMAIL_FROM: z.email(),
  EMAIL_ALLOWED_ORIGINS: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: boolean.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = schema.safeParse({
    ...env,
    APP_ENV: env.APP_ENV ?? (env.NODE_ENV === "production" ? "prod" : "dev"),
  });
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
    ].join(", ");
    throw new Error(`Invalid configuration: ${fields}`);
  }
  const config = parsed.data;
  if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD))
    throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together");
  const allowedOrigins = config.EMAIL_ALLOWED_ORIGINS.split(",").map((value) =>
    value.trim(),
  );
  const corsOrigins = config.CORS_ALLOWED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const serviceKeys = {
    "api-core": config.SERVICE_KEY_API_CORE,
    "api-auth": config.SERVICE_KEY_API_AUTH,
  };
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
  return { ...config, allowedOrigins, corsOrigins, serviceKeys };
}

export type EmailConfig = ReturnType<typeof readConfig>;
