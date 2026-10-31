import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../config/config.js";
import type { EmailTransport } from "../email/email.service.js";
import { grafanaAlert, grafanaPayload } from "./test-data.js";
import { grafanaWebhookSchema } from "./alerts.schema.js";
import { toIncident } from "./alerts.model.js";
import { renderAlertEmail, sendAlertEmail } from "./alert-email.service.js";

const config = readConfig({
  SERVICE_KEY_API_CORE: "test-key-only-not-a-secret-1234567890",
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
  ALERT_GRAFANA_URL: "http://localhost:3000",
});
const now = new Date("2026-10-30T17:00:00Z");
const incident = (alert = grafanaAlert()) =>
  toIncident(
    grafanaWebhookSchema.parse(grafanaPayload([alert])).alerts[0]!,
    config.alerts,
    now,
  );
const transport = (): EmailTransport => ({
  send: vi.fn().mockResolvedValue("<id@example.com>"),
  verify: vi.fn().mockResolvedValue(undefined),
  close: vi.fn(),
});

describe("alert e-mail", () => {
  it("renders the subject, the details and the Grafana links", async () => {
    const email = await renderAlertEmail(incident());
    expect(email.subject).toBe(
      "[P1] core (prod): 7.1 % de respostas 5xx há 10 min",
    );
    expect(email.html).toContain("core (prod)");
    expect(email.html).toContain("Primeiros passos");
    expect(email.html).toContain("30 minutos antes e 30 minutos depois");
    expect(email.html).toContain(
      "http://localhost:3000/d/solier-servico-java?var-service=core&amp;var-environment=prod",
    );
    expect(email.html).not.toContain("evil");
    expect(email.text).toContain("Primeiros passos");
  });
  it("marks resolved alerts", async () => {
    const email = await renderAlertEmail(
      incident(
        grafanaAlert({ status: "resolved", endsAt: "2026-10-30T16:20:00Z" }),
      ),
    );
    expect(email.subject.startsWith("[RESOLVIDO] [P1]")).toBe(true);
    expect(email.html).toContain("voltou ao normal");
  });
  it("escapes alert text instead of rendering it as HTML", async () => {
    const email = await renderAlertEmail(
      incident(
        grafanaAlert({
          annotations: {
            ...grafanaAlert().annotations,
            impact: '<script>alert("x")</script>',
          },
        }),
      ),
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
  it("sends one message per recipient and counts the failures", async () => {
    const mail = transport();
    vi.mocked(mail.send)
      .mockResolvedValueOnce("<1@example.com>")
      .mockRejectedValueOnce(new Error("smtp down"))
      .mockResolvedValueOnce("<3@example.com>");
    const result = await sendAlertEmail(
      [incident()],
      ["a@example.com", "b@example.com", "c@example.com"],
      "noreply@example.com",
      mail,
    );
    expect(result).toEqual({ sent: 2, failed: 1 });
    expect(mail.send).toHaveBeenCalledTimes(3);
    expect(vi.mocked(mail.send).mock.calls[0]![0]).toMatchObject({
      from: "noreply@example.com",
      to: "a@example.com",
    });
  });
});

describe("alert e-mail wording", () => {
  it("uses an alert footer instead of the transactional one", async () => {
    const email = await renderAlertEmail(incident());
    expect(email.html).toContain("Aviso automático do Grafana do SOLIER");
    expect(email.html).not.toContain("Se você não solicitou");
  });
  it("does not repeat the summary as the page heading", async () => {
    const email = await renderAlertEmail(incident());
    const summary = "core (prod): 7.1 % de respostas 5xx há 10 min";
    expect(email.html.split(summary).length - 1).toBe(1);
    expect(email.html).toContain("Alerta P1: core");
    const resolved = await renderAlertEmail(
      incident(grafanaAlert({ status: "resolved" })),
    );
    expect(resolved.html).toContain("Alerta P1 resolvido: core");
  });
});

describe("alert e-mail typography", () => {
  it("turns off the font's contextual alternates so 5xx is not drawn as 5×x", async () => {
    const email = await renderAlertEmail(incident());
    expect(email.html).toContain("font-feature-settings:&quot;calt&quot; 0");
  });
});
