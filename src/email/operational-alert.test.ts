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
    serviceName: "core",
    environment: "prod",
    summary: "7,1 % das respostas com erro 5xx há 10 min",
    impact: "Pelo menos 1 em cada 20 requisições falha há 10 minutos.",
    firstSteps: ["Abrir o dashboard do serviço.", "Ver os logs de erro."],
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
  it("rejects an unknown priority, status and too many steps", () => {
    expect(
      emailSchema.safeParse(request({ alertPriority: "P9" })).success,
    ).toBe(false);
    expect(
      emailSchema.safeParse(request({ alertStatus: "unknown" })).success,
    ).toBe(false);
    expect(
      emailSchema.safeParse(
        request({
          firstSteps: Array.from({ length: 7 }, (_, i) => `passo ${i}`),
        }),
      ).success,
    ).toBe(false);
  });
  it("rejects control characters in the free text fields", () => {
    expect(
      emailSchema.safeParse(request({ summary: "linha\nquebrada" })).success,
    ).toBe(false);
  });
});

describe("operational-alert rendering", () => {
  it("renders the priority, service, summary, steps and the dashboard button", async () => {
    const email = await renderEmail(emailSchema.parse(request()));
    expect(email.subject).toBe(
      "[P2] core (prod): 7,1 % das respostas com erro 5xx há 10 min",
    );
    expect(email.html).toContain("Alerta P2");
    expect(email.html).toContain("core (prod)");
    expect(email.html).toContain("Abrir o dashboard do serviço");
    expect(email.html).toContain("grafana.example.test");
    expect(email.text).toContain("1. Abrir o dashboard do serviço.");
    expect(email.text).toContain("2. Ver os logs de erro.");
  });
  it("marks a resolved alert in the subject and leaves the steps out", async () => {
    const email = await renderEmail(
      emailSchema.parse(
        request({
          alertStatus: "resolved",
          endedAt: "2026-10-31T18:16:00Z",
        }),
      ),
    );
    expect(email.subject).toMatch(/^\[RESOLVIDO\] \[P2\] core/);
    expect(email.html).toContain("Alerta resolvido");
    expect(email.html).toContain("Fim");
    expect(email.text).not.toContain("Primeiros passos");
  });
  it("translates the labels and the subject prefix", async () => {
    const en = await renderEmail(
      emailSchema.parse(request({ alertStatus: "resolved" }, "en-US")),
    );
    expect(en.subject).toMatch(/^\[RESOLVED\] /);
    expect(en.html).toContain("Alert resolved");
    const es = await renderEmail(emailSchema.parse(request({}, "es-ES")));
    expect(es.html).toContain("Primeros pasos");
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
