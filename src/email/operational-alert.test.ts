import { describe, expect, it } from "vitest";
import { renderEmail } from "./email.service.js";
import { emailSchema } from "./email.schema.js";

const request = (data: Record<string, unknown> = {}, locale = "pt-BR") => ({
  template: "operational-alert",
  locale,
  to: "dev@example.com",
  data: {
    alertPriority: "P2",
    alertStatus: "firing",
    serviceName: "api-core",
    environment: "prod",
    summary: "7,1 % das respostas com erro 5xx há 10 min",
    impact: "Pelo menos 1 em cada 20 requisições falha há 10 minutos.",
    serviceUrl: "https://core.example.test",
    startedAt: "2026-10-31T18:00:00Z",
    actionUrl: "https://grafana.example.test/d/service-detail?var-service=core",
    ...data,
  },
});

describe("operational-alert contract", () => {
  it("accepts a complete alert", () => {
    expect(emailSchema.safeParse(request()).success).toBe(true);
  });
  it.each([
    "alertPriority",
    "alertStatus",
    "serviceName",
    "environment",
    "summary",
    "startedAt",
    "actionUrl",
  ])("requires %s", (field) => {
    const body = request();
    delete (body.data as Record<string, unknown>)[field];
    const result = emailSchema.safeParse(body);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(field);
  });
  it("rejects an unknown priority, status and an insecure service link", () => {
    expect(
      emailSchema.safeParse(request({ alertPriority: "P9" })).success,
    ).toBe(false);
    expect(
      emailSchema.safeParse(request({ alertStatus: "unknown" })).success,
    ).toBe(false);
    expect(
      emailSchema.safeParse(request({ serviceUrl: "http://core.example.test" }))
        .success,
    ).toBe(false);
  });
  it("rejects control characters in the free text fields", () => {
    expect(
      emailSchema.safeParse(request({ summary: "linha\nquebrada" })).success,
    ).toBe(false);
  });
});

describe("operational-alert rendering", () => {
  it("renders the priority, the linked service, the summary and the dashboard button", async () => {
    const email = await renderEmail(emailSchema.parse(request()));
    expect(email.subject).toBe(
      "[Alerta: P2] api-core em ambiente produtivo: 7,1 % das respostas com erro 5xx há 10 min",
    );
    expect(email.text).toContain("Alerta P2 no serviço api-core");
    expect(email.text).toContain("em ambiente produtivo");
    expect(email.html).toContain("Abrir o dashboard do serviço");
    expect(email.html).toContain("grafana.example.test");
    expect(email.text).not.toContain("Primeiros passos");
  });
  it("marks a resolved alert in the subject and shows the end", async () => {
    const email = await renderEmail(
      emailSchema.parse(
        request({
          alertStatus: "resolved",
          endedAt: "2026-10-31T18:16:00Z",
        }),
      ),
    );
    expect(email.subject).toMatch(
      /^\[Alerta resolvido: P2\] api-core em ambiente produtivo/,
    );
    expect(email.text).toContain("Alerta resolvido P2 no serviço api-core");
    expect(email.text).toContain("em ambiente produtivo");
    expect(email.text).toContain("Fim:");
    expect(email.text).not.toContain("Primeiros passos");
  });
  it("translates the labels and the subject prefix", async () => {
    const en = await renderEmail(
      emailSchema.parse(request({ alertStatus: "resolved" }, "en-US")),
    );
    expect(en.subject).toMatch(/^\[Alert resolved: P2\] /);
    expect(en.text).toContain("Alert resolved P2 on service api-core");
    expect(en.text).toContain("in production environment");
    const es = await renderEmail(emailSchema.parse(request({}, "es-ES")));
    expect(es.text).toContain("Alerta P2 en el servicio api-core");
    expect(es.text).toContain("en entorno productivo");
  });
  it("shows the time in Brasília time and escapes the content", async () => {
    const email = await renderEmail(
      emailSchema.parse(
        request({
          summary: "<script>alert(1)</script> falha",
          impact: "a & b",
        }),
      ),
    );
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("15:00");
    expect(email.html).toContain("horário de Brasília");
  });
  it("keeps the subject within 200 characters", async () => {
    const email = await renderEmail(
      emailSchema.parse(request({ summary: "x".repeat(300) })),
    );
    expect(email.subject.length).toBeLessThanOrEqual(200);
  });
});

describe("operational-alert service link", () => {
  it("links the service name to its address", async () => {
    const email = await renderEmail(emailSchema.parse(request()));
    expect(email.html).toMatch(
      /<a[^>]*href="https:\/\/core\.example\.test"[^>]*>api-core<\/a>/,
    );
  });
  it("shows the name as text when there is no address", async () => {
    const body = request();
    delete (body.data as Record<string, unknown>).serviceUrl;
    const email = await renderEmail(emailSchema.parse(body));
    expect(email.html).not.toContain("core.example.test");
    expect(email.text).toContain("Alerta P2 no serviço api-core");
    expect(email.text).toContain("em ambiente produtivo");
  });
  it("cuts a long subject with three plain dots", async () => {
    const email = await renderEmail(
      emailSchema.parse(request({ summary: "x".repeat(300) })),
    );
    expect(email.subject.endsWith("...")).toBe(true);
    expect(email.subject.length).toBe(200);
  });
});

describe("operational-alert environment in words", () => {
  it.each([
    ["qa", "pt-BR", "em ambiente de QA"],
    ["dev", "en-US", "in development environment"],
    ["staging", "es-ES", "en entorno staging"],
  ])("writes %s in %s as %s", async (environment, locale, words) => {
    const email = await renderEmail(
      emailSchema.parse(request({ environment }, locale)),
    );
    expect(email.text).toContain(words);
    expect(email.text).not.toContain(`(${environment})`);
  });
});
