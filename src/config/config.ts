import { z } from "zod";

const boolean = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const serviceKey = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(32).max(256).optional(),
);
const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).max(2048).optional(),
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
  SERVICE_KEY_GRAFANA: serviceKey,
  SERVICE_KEY_WORKER_ALERTS: serviceKey,
  EMAIL_API_KEY: serviceKey,
  DOCS_ENABLED: boolean.default(true),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:3000,http://localhost:5173"),
  EMAIL_FROM: z.email(),
  EMAIL_ALLOWED_ORIGINS: z.string().min(1),
  EMAIL_TRANSPORT: z.enum(["smtp", "brevo"]).default("smtp"),
  BREVO_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: boolean.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  ALERT_ENVIRONMENT: z.string().min(1).max(40).default("prod"),
  ALERT_EMAIL_TO: optionalText,
  ALERT_GRAFANA_URL: optionalText,
  ALERT_MIN_INTERVAL_MIN: z.coerce.number().int().min(1).max(1440).default(30),
  ALERT_MAX_PER_24H: z.coerce.number().int().min(1).max(100).default(8),
  ALERT_LOG_WINDOW_MIN: z.coerce.number().int().min(1).max(240).default(30),
  JIRA_BASE_URL: optionalText,
  JIRA_USER: optionalText,
  JIRA_API_TOKEN: optionalText,
  JIRA_PROJECT: z.string().min(1).max(20).default("INC"),
  JIRA_ISSUE_TYPE: z.string().min(1).max(60).default("Incidente"),
  JIRA_FIELD_START: optionalText,
  JIRA_FIELD_END: optionalText,
  WHATSAPP_ACCESS_TOKEN: optionalText,
  WHATSAPP_PHONE_NUMBER_ID: optionalText,
  WHATSAPP_TEMPLATE_NAME: optionalText,
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().min(2).max(10).default("pt_BR"),
  WHATSAPP_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .default("v23.0"),
  WHATSAPP_ALERT_TO: optionalText,
  WHATSAPP_API_BASE_URL: optionalText,
});

const invalid = (field: string) => new Error(`Invalid configuration: ${field}`);
const customField = /^customfield_\d+$/;

function readAlerts(config: z.infer<typeof schema>, allowedHttp: boolean) {
  const emailTo = (config.ALERT_EMAIL_TO ?? "")
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (emailTo.some((value) => !z.email().safeParse(value).success))
    throw invalid("ALERT_EMAIL_TO");

  const httpsOnly = (value: string, field: string) => {
    if (!URL.canParse(value)) throw invalid(field);
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      !["http:", "https:"].includes(url.protocol) ||
      (!allowedHttp && url.protocol !== "https:")
    )
      throw invalid(field);
    return url.origin + url.pathname.replace(/\/+$/, "");
  };
  const grafanaUrl = config.ALERT_GRAFANA_URL
    ? httpsOnly(config.ALERT_GRAFANA_URL, "ALERT_GRAFANA_URL")
    : undefined;

  const jiraVars = [
    config.JIRA_BASE_URL,
    config.JIRA_USER,
    config.JIRA_API_TOKEN,
    config.JIRA_FIELD_START,
    config.JIRA_FIELD_END,
  ];
  if (jiraVars.some(Boolean) && !jiraVars.every(Boolean))
    throw new Error("JIRA_* must be configured together");
  let jira;
  if (config.JIRA_BASE_URL) {
    if (!customField.test(config.JIRA_FIELD_START ?? ""))
      throw invalid("JIRA_FIELD_START");
    if (!customField.test(config.JIRA_FIELD_END ?? ""))
      throw invalid("JIRA_FIELD_END");
    jira = {
      baseUrl: httpsOnly(config.JIRA_BASE_URL, "JIRA_BASE_URL"),
      user: config.JIRA_USER!,
      apiToken: config.JIRA_API_TOKEN!,
      project: config.JIRA_PROJECT,
      issueType: config.JIRA_ISSUE_TYPE,
      fieldStart: config.JIRA_FIELD_START!,
      fieldEnd: config.JIRA_FIELD_END!,
    };
  }

  const whatsappVars = [
    config.WHATSAPP_ACCESS_TOKEN,
    config.WHATSAPP_PHONE_NUMBER_ID,
    config.WHATSAPP_TEMPLATE_NAME,
    config.WHATSAPP_ALERT_TO,
  ];
  if (whatsappVars.some(Boolean) && !whatsappVars.every(Boolean))
    throw new Error("WHATSAPP_* must be configured together");
  let whatsapp;
  if (config.WHATSAPP_ACCESS_TOKEN) {
    const to = config
      .WHATSAPP_ALERT_TO!.split(/[;,]/)
      .map((value) => value.replace(/[\s+()-]/g, ""))
      .filter(Boolean);
    if (!to.length || to.some((value) => !/^\d{8,15}$/.test(value)))
      throw invalid("WHATSAPP_ALERT_TO");
    if (!/^\d{5,20}$/.test(config.WHATSAPP_PHONE_NUMBER_ID!))
      throw invalid("WHATSAPP_PHONE_NUMBER_ID");
    if (!/^[a-z0-9_]{1,512}$/.test(config.WHATSAPP_TEMPLATE_NAME!))
      throw invalid("WHATSAPP_TEMPLATE_NAME");
    whatsapp = {
      accessToken: config.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: config.WHATSAPP_PHONE_NUMBER_ID!,
      templateName: config.WHATSAPP_TEMPLATE_NAME!,
      templateLanguage: config.WHATSAPP_TEMPLATE_LANGUAGE,
      apiVersion: config.WHATSAPP_API_VERSION,
      apiBaseUrl: config.WHATSAPP_API_BASE_URL
        ? httpsOnly(config.WHATSAPP_API_BASE_URL, "WHATSAPP_API_BASE_URL")
        : "https://graph.facebook.com",
      to,
    };
  }

  return {
    environment: config.ALERT_ENVIRONMENT,
    emailTo,
    grafanaUrl,
    minIntervalMin: config.ALERT_MIN_INTERVAL_MIN,
    maxPer24h: config.ALERT_MAX_PER_24H,
    logWindowMin: config.ALERT_LOG_WINDOW_MIN,
    jira,
    whatsapp,
  };
}

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
  const corsOrigins = config.CORS_ALLOWED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const serviceKeys = {
    "api-core": config.SERVICE_KEY_API_CORE,
    "api-auth": config.SERVICE_KEY_API_AUTH,
    grafana: config.SERVICE_KEY_GRAFANA,
    "worker-alerts": config.SERVICE_KEY_WORKER_ALERTS,
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
  const alerts = readAlerts(config, config.APP_ENV === "dev");
  return { ...config, allowedOrigins, corsOrigins, serviceKeys, alerts };
}

export type EmailConfig = ReturnType<typeof readConfig>;
