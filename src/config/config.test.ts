import { expect, it } from "vitest";
import { readConfig } from "./config.js";
import { isAllowedActionUrl } from "../email/email.schema.js";
const env = {
  SERVICE_KEY_API_CORE: "test-key-only-not-a-secret-1234567890",
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
};
it("requires credentials and reports field names without values", () => {
  expect(() =>
    readConfig({ ...env, SERVICE_KEY_API_AUTH: "short-sensitive-key" }),
  ).toThrow("SERVICE_KEY_API_AUTH");
  expect(() => readConfig({ ...env, SMTP_USER: "username" })).toThrow(
    "configured together",
  );
});
it("requires HTTPS in QA and prod and parses false booleans correctly", () => {
  expect(readConfig({ ...env, SMTP_SECURE: "false" }).SMTP_SECURE).toBe(false);
  expect(() => readConfig({ ...env, APP_ENV: "qa" })).toThrow(
    "EMAIL_ALLOWED_ORIGINS",
  );
  const config = readConfig({
    ...env,
    NODE_ENV: "production",
    EMAIL_ALLOWED_ORIGINS: "https://solaria.example",
  });
  expect(config.APP_ENV).toBe("prod");
  expect(
    isAllowedActionUrl("https://solaria.example/verify?token=test", config),
  ).toBe(true);
  expect(isAllowedActionUrl("http://solaria.example/verify", config)).toBe(
    false,
  );
  expect(
    isAllowedActionUrl("https://solaria.example.evil/verify", config),
  ).toBe(false);
});
it("rejects malformed origins and invalid environment values", () => {
  expect(() =>
    readConfig({ ...env, EMAIL_ALLOWED_ORIGINS: "not-a-url" }),
  ).toThrow();
  expect(() =>
    readConfig({ ...env, EMAIL_ALLOWED_ORIGINS: "http://localhost:5173/path" }),
  ).toThrow();
  expect(() => readConfig({ ...env, SMTP_SECURE: "yes" })).toThrow(
    "SMTP_SECURE",
  );
});
it("keeps documentation on by default and parses the CORS origins", () => {
  const config = readConfig(env);
  expect(config.DOCS_ENABLED).toBe(true);
  expect(config.corsOrigins).toEqual([
    "http://localhost:3000",
    "http://localhost:5173",
  ]);
  expect(readConfig({ ...env, DOCS_ENABLED: "false" }).DOCS_ENABLED).toBe(
    false,
  );
});
it("selects Brevo without SMTP and validates the transport settings", () => {
  const brevo = readConfig({
    ...env,
    SMTP_HOST: undefined,
    EMAIL_TRANSPORT: "brevo",
    BREVO_API_KEY: "provider-test-key",
  });
  expect(brevo.EMAIL_TRANSPORT).toBe("brevo");
  expect(() => readConfig({ ...env, EMAIL_TRANSPORT: "brevo" })).toThrow(
    "BREVO_API_KEY",
  );
  expect(() => readConfig({ ...env, SMTP_HOST: undefined })).toThrow(
    "SMTP_HOST",
  );
});
const jiraEnv = {
  JIRA_BASE_URL: "https://example.atlassian.net",
  JIRA_USER: "grafana@example.com",
  JIRA_API_TOKEN: "jira-test-token-only",
  JIRA_FIELD_START: "customfield_10294",
  JIRA_FIELD_END: "customfield_10295",
};
const whatsappEnv = {
  WHATSAPP_ACCESS_TOKEN: "whatsapp-test-token-only",
  WHATSAPP_PHONE_NUMBER_ID: "1234567890",
  WHATSAPP_TEMPLATE_NAME: "solier_alerta",
  WHATSAPP_ALERT_TO: "+55 11 91234-5678, 5511999998888",
};
it("keeps the alert channels off until their variables are complete", () => {
  const off = readConfig(env).alerts;
  expect(off.jira).toBeUndefined();
  expect(off.whatsapp).toBeUndefined();
  expect(off).toMatchObject({
    environment: "prod",
    minIntervalMin: 30,
    maxPer24h: 8,
    logWindowMin: 30,
    emailTo: [],
  });
  expect(() =>
    readConfig({ ...env, JIRA_BASE_URL: jiraEnv.JIRA_BASE_URL }),
  ).toThrow("JIRA_* must be configured together");
  expect(() =>
    readConfig({ ...env, JIRA_USER: "grafana@example.com" }),
  ).toThrow("JIRA_* must be configured together");
  expect(() =>
    readConfig({ ...env, WHATSAPP_ACCESS_TOKEN: "token-only-in-the-env" }),
  ).toThrow("WHATSAPP_* must be configured together");
  expect(() =>
    readConfig({ ...env, ...jiraEnv, JIRA_FIELD_START: "start" }),
  ).toThrow("JIRA_FIELD_START");
});
it("parses the Jira and WhatsApp channels without echoing secrets", () => {
  const { jira, whatsapp } = readConfig({
    ...env,
    ...jiraEnv,
    ...whatsappEnv,
  }).alerts;
  expect(jira).toMatchObject({
    baseUrl: "https://example.atlassian.net",
    project: "INC",
    issueType: "Incidente",
    fieldStart: "customfield_10294",
    fieldEnd: "customfield_10295",
  });
  expect(whatsapp).toMatchObject({
    phoneNumberId: "1234567890",
    templateName: "solier_alerta",
    templateLanguage: "pt_BR",
    apiVersion: "v23.0",
    to: ["5511912345678", "5511999998888"],
  });
  expect(() =>
    readConfig({ ...env, ...jiraEnv, JIRA_BASE_URL: "http://jira.example" }),
  ).not.toThrow();
  expect(() =>
    readConfig({
      ...env,
      ...jiraEnv,
      APP_ENV: "qa",
      EMAIL_ALLOWED_ORIGINS: "https://solaria.example",
      JIRA_BASE_URL: "http://jira.example",
    }),
  ).toThrow("JIRA_BASE_URL");
  expect(() =>
    readConfig({ ...env, ...whatsappEnv, WHATSAPP_ALERT_TO: "abc" }),
  ).toThrow("WHATSAPP_ALERT_TO");
});
it("validates the alert recipients, Grafana URL and Grafana key", () => {
  const config = readConfig({
    ...env,
    ALERT_EMAIL_TO: "a@example.com; b@example.com,c@example.com",
    ALERT_GRAFANA_URL: "http://localhost:3000/",
    SERVICE_KEY_GRAFANA: "grafana-test-key-only-not-a-secret-123456",
  });
  expect(config.alerts.emailTo).toEqual([
    "a@example.com",
    "b@example.com",
    "c@example.com",
  ]);
  expect(config.alerts.grafanaUrl).toBe("http://localhost:3000");
  expect(config.serviceKeys.grafana).toBeDefined();
  expect(() => readConfig({ ...env, ALERT_EMAIL_TO: "not-an-email" })).toThrow(
    "ALERT_EMAIL_TO",
  );
  expect(() =>
    readConfig({
      ...env,
      APP_ENV: "qa",
      EMAIL_ALLOWED_ORIGINS: "https://solaria.example",
      ALERT_GRAFANA_URL: "http://grafana.example",
    }),
  ).toThrow("ALERT_GRAFANA_URL");
  expect(() =>
    readConfig({ ...env, SERVICE_KEY_GRAFANA: "short-sensitive-key" }),
  ).toThrow("SERVICE_KEY_GRAFANA");
});
it("lets the WhatsApp API base URL be overridden, over HTTPS outside dev", () => {
  expect(
    readConfig({ ...env, ...whatsappEnv }).alerts.whatsapp?.apiBaseUrl,
  ).toBe("https://graph.facebook.com");
  expect(
    readConfig({
      ...env,
      ...whatsappEnv,
      WHATSAPP_API_BASE_URL: "http://localhost:8089/",
    }).alerts.whatsapp?.apiBaseUrl,
  ).toBe("http://localhost:8089");
  expect(() =>
    readConfig({
      ...env,
      ...whatsappEnv,
      APP_ENV: "qa",
      EMAIL_ALLOWED_ORIGINS: "https://solaria.example",
      WHATSAPP_API_BASE_URL: "http://localhost:8089",
    }),
  ).toThrow("WHATSAPP_API_BASE_URL");
});
