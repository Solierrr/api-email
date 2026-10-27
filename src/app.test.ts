import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "./app.js";
import { readConfig } from "./config/config.js";
import type { EmailTransport } from "./email/email.service.js";

const key = "test-key-only-not-a-secret-1234567890";
const config = readConfig({
  NODE_ENV: "test",
  APP_ENV: "dev",
  EMAIL_API_KEY: key,
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
});
const payload = {
  template: "email-verification",
  to: "user@example.com",
  data: {
    name: "David",
    actionUrl: "http://localhost:5173/pt-BR/verificar-email?token=test",
  },
};
let transport: EmailTransport;
let app: ReturnType<typeof buildApp>;
beforeEach(() => {
  transport = {
    send: vi.fn().mockResolvedValue("<test@example.com>"),
    verify: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  };
  app = buildApp(config, transport, false);
});
afterEach(async () => {
  await app.close();
});
const send = (body: unknown = payload, apiKey = key, url = "/emails") =>
  app.inject({
    method: "POST",
    url,
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    payload: JSON.stringify(body),
  });

describe("Email HTTP contract", () => {
  it("exposes Swagger with a protected send and preview contract", async () => {
    const response = await app.inject({ url: "/openapi.json" });
    expect(response.statusCode).toBe(200);
    const document = response.json();
    expect(
      document.components.schemas.EmailRequest.properties.template.enum,
    ).toContain("email-verification");
    expect(document.paths["/emails"].post.security).toEqual([
      { ServiceKey: [] },
    ]);
    expect(document.paths["/emails/preview"].post.security).toEqual([
      { ServiceKey: [] },
    ]);
    expect(document.components.securitySchemes.ServiceKey.name).toBe(
      "X-API-Key",
    );
    expect(response.body).not.toContain(key);
    const docs = await app.inject({ url: "/docs/" });
    expect(docs.statusCode).toBe(200);
    expect(docs.body).toContain("swagger-ui");
  });
  it("exposes liveness without disclosing SMTP configuration", async () => {
    const response = await app.inject({ url: "/health" });
    expect(response.json()).toEqual({ status: "ok" });
    expect(transport.verify).not.toHaveBeenCalled();
  });
  it("returns unavailable when SMTP readiness fails", async () => {
    vi.mocked(transport.verify).mockRejectedValue(
      new Error("secret SMTP details"),
    );
    const response = await app.inject({ url: "/ready" });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain("secret");
  });
  it.each(["/emails", "/emails/preview"])("protects %s", async (url) => {
    const response = await send(payload, "wrong-key", url);
    expect(response.statusCode).toBe(401);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("rejects an unknown template without sending", async () => {
    expect(
      (await send({ ...payload, template: "arbitrary-html" })).statusCode,
    ).toBe(400);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it.each([
    "javascript:alert(1)",
    "https://evil.example/path",
    "http://user:password@localhost:5173/path",
  ])("rejects untrusted links: %s", async (actionUrl) => {
    expect((await send({ ...payload, data: { actionUrl } })).statusCode).toBe(
      400,
    );
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("rejects HTML payloads, sender overrides and multiple recipients", async () => {
    for (const body of [
      { ...payload, html: "<h1>test</h1>" },
      { ...payload, from: "other@example.com" },
      { ...payload, to: ["a@example.com", "b@example.com"] },
    ]) {
      expect((await send(body)).statusCode).toBe(400);
    }
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("requires a company name for invitations", async () => {
    expect(
      (await send({ ...payload, template: "company-invitation" })).statusCode,
    ).toBe(400);
  });
  it("previews escaped HTML and readable plain text without sending", async () => {
    const response = await send(
      {
        ...payload,
        data: { ...payload.data, name: "<script>alert(1)</script>" },
      },
      key,
      "/emails/preview",
    );
    expect(response.statusCode).toBe(200);
    const rendered = response.json();
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).not.toContain("<script>");
    expect(rendered.text).toContain(payload.data.actionUrl);
    expect(transport.send).not.toHaveBeenCalled();
  });
  it("waits for SMTP before acknowledging a send", async () => {
    let complete!: (value: string) => void;
    vi.mocked(transport.send).mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const result = send();
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledOnce());
    complete("<accepted@example.com>");
    const response = await result;
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "accepted",
      messageId: "<accepted@example.com>",
    });
    expect(transport.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: config.EMAIL_FROM,
        to: payload.to,
        html: expect.any(String),
        text: expect.any(String),
      }),
    );
  });
  it("reports a failed delivery attempt without leaking SMTP errors", async () => {
    vi.mocked(transport.send).mockRejectedValue(
      new Error("SMTP password and token"),
    );
    const response = await send();
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: "EMAIL_SEND_FAILED" });
    expect(response.body).not.toContain("password");
  });
  it("handles malformed JSON without echoing sensitive payloads", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/emails",
      headers: { "x-api-key": key, "content-type": "application/json" },
      payload: '{"token":"secret"',
    });
    expect(response.statusCode).toBe(400);
    expect(response.body).not.toContain("secret");
  });
});
