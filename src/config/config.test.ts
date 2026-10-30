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
