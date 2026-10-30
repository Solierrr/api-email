import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app.js";
import { readConfig } from "../config/config.js";
import type { EmailTransport } from "../email/email.service.js";
import { grafanaAlert, grafanaLabels, grafanaPayload } from "./test-data.js";
import type { AlertDependencies } from "./alerts.routes.js";
import { JiraRequestError } from "./jira.client.js";

const grafanaKey = "grafana-test-key-only-not-a-secret-123456";
const coreKey = "test-key-only-not-a-secret-1234567890";
const env = {
  NODE_ENV: "test",
  APP_ENV: "dev",
  SERVICE_KEY_API_CORE: coreKey,
  SERVICE_KEY_GRAFANA: grafanaKey,
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
  ALERT_GRAFANA_URL: "http://localhost:3000",
};
const full = readConfig({
  ...env,
  ALERT_EMAIL_TO: "dev1@example.com;dev2@example.com",
  JIRA_BASE_URL: "https://example.atlassian.net",
  JIRA_USER: "grafana@example.com",
  JIRA_API_TOKEN: "jira-test-token-only",
  JIRA_FIELD_START: "customfield_10294",
  JIRA_FIELD_END: "customfield_10295",
  WHATSAPP_ACCESS_TOKEN: "whatsapp-test-token-only",
  WHATSAPP_PHONE_NUMBER_ID: "1234567890",
  WHATSAPP_TEMPLATE_NAME: "solier_alerta",
  WHATSAPP_ALERT_TO: "5511912345678,5511999998888",
});
const bare = readConfig(env);

let transport: EmailTransport;
let deps: {
  jira: {
    [K in "search" | "create" | "setEnd" | "comment" | "link"]: ReturnType<
      typeof vi.fn
    >;
  };
  whatsapp: { send: ReturnType<typeof vi.fn> };
};
let app: Awaited<ReturnType<typeof buildApp>>;
const build = (config = full) =>
  buildApp(config, transport, false, deps as unknown as AlertDependencies);

beforeEach(async () => {
  transport = {
    send: vi.fn().mockResolvedValue("<test@example.com>"),
    verify: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
  deps = {
    jira: {
      search: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ key: "INC-1" }),
      setEnd: vi.fn().mockResolvedValue(undefined),
      comment: vi.fn().mockResolvedValue(undefined),
      link: vi.fn().mockResolvedValue(undefined),
    },
    whatsapp: { send: vi.fn().mockResolvedValue("wamid.1") },
  };
  app = await build();
});
afterEach(async () => {
  await app.close();
});

const post = (
  url: string,
  body: unknown = grafanaPayload(),
  key = grafanaKey,
) =>
  app.inject({
    method: "POST",
    url,
    headers: { "x-service-key": key, "content-type": "application/json" },
    payload: JSON.stringify(body),
  });
const channels = ["jira", "email", "whatsapp"];
const routes = channels.flatMap((name) => [
  `/alerts/${name}`,
  `/alerts/${name}/preview`,
]);

describe("alert routes: access and validation", () => {
  it.each(routes)("protects %s by caller", async (url) => {
    expect((await post(url, grafanaPayload(), "wrong-key")).statusCode).toBe(
      401,
    );
    const forbidden = await post(url, grafanaPayload(), coreKey);
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({ errorCode: "FORBIDDEN" });
  });
  it("keeps the e-mail routes closed to Grafana", async () => {
    const response = await post(
      "/emails",
      { template: "email-verification" },
      grafanaKey,
    );
    expect(response.statusCode).toBe(403);
  });
  it.each(routes)("rejects an invalid payload on %s", async (url) => {
    const labels: Record<string, string> = grafanaLabels({});
    delete labels.priority;
    const response = await post(
      url,
      grafanaPayload([grafanaAlert({ labels })]),
    );
    expect(response.statusCode).toBe(422);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({
      errorCode: "VALIDATION_FAILED",
      errors: [{ field: expect.stringContaining("priority") }],
    });
  });
  it("accepts groups bigger than the default limit but not huge bodies", async () => {
    const group = grafanaPayload(
      Array.from({ length: 40 }, () => grafanaAlert()),
    );
    expect(JSON.stringify(group).length).toBeGreaterThan(16384);
    expect((await post("/alerts/jira/preview", group)).statusCode).toBe(200);
    const huge = grafanaPayload([
      grafanaAlert({ annotations: { summary: "x".repeat(300_000) } }),
    ]);
    expect((await post("/alerts/jira/preview", huge)).statusCode).toBe(413);
  });
});

describe("POST /alerts/jira", () => {
  it("creates the ticket and answers per alert", async () => {
    const response = await post("/alerts/jira");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      results: [
        {
          alertId: "A03",
          service: "core",
          action: "created",
          issueKey: "INC-1",
        },
      ],
    });
    expect(deps.jira.create).toHaveBeenCalledOnce();
  });
  it("ignores other environments", async () => {
    const response = await post(
      "/alerts/jira",
      grafanaPayload([
        grafanaAlert({
          labels: grafanaLabels({ deployment_environment: "qa" }),
        }),
      ]),
    );
    expect(response.json().results[0].action).toBe("ignored_env");
    expect(deps.jira.search).not.toHaveBeenCalled();
  });
  it("asks Grafana to retry when Jira fails, without leaking details", async () => {
    deps.jira.search.mockRejectedValue(new JiraRequestError("search", 503));
    const response = await post("/alerts/jira");
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ errorCode: "JIRA_REQUEST_FAILED" });
    expect(response.body).not.toMatch(/token|grafana@|atlassian/);
  });
  it("previews the ticket without calling Jira", async () => {
    const response = await post("/alerts/jira/preview");
    expect(response.statusCode).toBe(200);
    expect(response.json().tickets[0]).toMatchObject({
      action: "would_create",
      summary: "[P1] core (prod): 7.1 % de respostas 5xx há 10 min",
      priority: "Highest",
    });
    expect(deps.jira.search).not.toHaveBeenCalled();
  });
});

describe("POST /alerts/email", () => {
  it("sends one message per recipient, resolved ones included", async () => {
    const response = await post(
      "/alerts/email",
      grafanaPayload([
        grafanaAlert(),
        grafanaAlert({ status: "resolved", endsAt: "2026-10-30T16:20:00Z" }),
      ]),
    );
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "accepted", sent: 4, failed: 0 });
    expect(transport.send).toHaveBeenCalledTimes(4);
  });
  it("answers 200 on a partial failure and 503 when nothing is accepted", async () => {
    vi.mocked(transport.send)
      .mockRejectedValueOnce(new Error("x"))
      .mockResolvedValueOnce("<ok@example.com>");
    expect((await post("/alerts/email")).json()).toEqual({
      status: "accepted",
      sent: 1,
      failed: 1,
    });
    vi.mocked(transport.send).mockRejectedValue(new Error("x"));
    const response = await post("/alerts/email");
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ errorCode: "EMAIL_SEND_FAILED" });
  });
  it("previews the rendered e-mail without sending", async () => {
    const response = await post("/alerts/email/preview");
    expect(response.json().emails[0]).toMatchObject({
      subject: expect.stringContaining("[P1]"),
      html: expect.stringContaining("Primeiros passos"),
    });
    expect(transport.send).not.toHaveBeenCalled();
  });
});

describe("POST /alerts/whatsapp", () => {
  it("sends firing alerts to every number and skips resolved ones", async () => {
    const response = await post(
      "/alerts/whatsapp",
      grafanaPayload([
        grafanaAlert(),
        grafanaAlert({ status: "resolved", endsAt: "2026-10-30T16:20:00Z" }),
      ]),
    );
    expect(response.json()).toEqual({ status: "accepted", sent: 2, failed: 0 });
    expect(deps.whatsapp.send).toHaveBeenCalledTimes(2);
    expect(deps.whatsapp.send.mock.calls[0]).toEqual([
      "5511912345678",
      [
        "P1",
        "core (prod): 7.1 % de respostas 5xx há 10 min",
        "core (prod)",
        "http://localhost:3000/d/solier-servico-java?var-service=core&var-environment=prod",
      ],
    ]);
  });
  it("answers 503 when no message is accepted", async () => {
    deps.whatsapp.send.mockRejectedValue(new Error("x"));
    const response = await post("/alerts/whatsapp");
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      errorCode: "WHATSAPP_SEND_FAILED",
    });
  });
  it("previews the template parameters without sending", async () => {
    const response = await post("/alerts/whatsapp/preview");
    expect(response.json().messages[0]).toMatchObject({
      template: "solier_alerta",
      language: "pt_BR",
      parameters: ["P1", expect.any(String), "core (prod)", expect.any(String)],
    });
    expect(deps.whatsapp.send).not.toHaveBeenCalled();
  });
});

describe("channels that are not configured", () => {
  it.each(channels)(
    "answers 503 on /alerts/%s but still previews",
    async (name) => {
      await app.close();
      app = await buildApp(bare, transport, false);
      const response = await post(`/alerts/${name}`);
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        errorCode: "CHANNEL_NOT_CONFIGURED",
      });
      expect((await post(`/alerts/${name}/preview`)).statusCode).toBe(200);
      expect(transport.send).not.toHaveBeenCalled();
    },
  );
});

describe("Bearer authentication", () => {
  const withBearer = (value: string) =>
    app.inject({
      method: "POST",
      url: "/alerts/jira/preview",
      headers: { authorization: value, "content-type": "application/json" },
      payload: JSON.stringify(grafanaPayload()),
    });
  it("accepts the Grafana key as a Bearer token, which Grafana stores encrypted", async () => {
    expect((await withBearer(`Bearer ${grafanaKey}`)).statusCode).toBe(200);
  });
  it("rejects wrong or malformed Bearer tokens and keeps caller scoping", async () => {
    expect((await withBearer("Bearer wrong-key")).statusCode).toBe(401);
    expect((await withBearer(grafanaKey)).statusCode).toBe(401);
    expect((await withBearer(`Basic ${grafanaKey}`)).statusCode).toBe(401);
    expect((await withBearer(`Bearer ${coreKey}`)).statusCode).toBe(403);
  });
});
