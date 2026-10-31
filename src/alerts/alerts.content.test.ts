import { describe, expect, it } from "vitest";
import { readConfig } from "../config/config.js";
import { grafanaAlert, grafanaLabels, grafanaPayload } from "./test-data.js";
import { grafanaWebhookSchema } from "./alerts.schema.js";
import { toIncident } from "./alerts.model.js";
import {
  emailSubject,
  formatDateTime,
  formatDuration,
  splitSteps,
  ticketDescription,
  ticketSummary,
  whatsappParameters,
} from "./alerts.content.js";

const config = readConfig({
  SERVICE_KEY_API_CORE: "test-key-only-not-a-secret-1234567890",
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
  ALERT_GRAFANA_URL: "http://localhost:3000",
}).alerts;
const now = new Date("2026-10-30T17:00:00Z");
const incident = (alert = grafanaAlert()) =>
  toIncident(
    grafanaWebhookSchema.parse(grafanaPayload([alert])).alerts[0]!,
    config,
    now,
  );
const flat = (value: unknown): string => JSON.stringify(value);

describe("alert texts", () => {
  it("formats dates in Brasília time and durations in words", () => {
    expect(formatDateTime(new Date("2026-10-30T16:06:30Z"))).toBe(
      "30/10/2026 13:06",
    );
    expect(formatDuration(65 * 60_000)).toBe("1 h 5 min");
    expect(formatDuration(8 * 60_000)).toBe("8 min");
    expect(formatDuration(20_000)).toBe("menos de 1 min");
  });
  it("prefixes the priority and stays inside the Jira summary limit", () => {
    expect(ticketSummary(incident())).toBe(
      "[P1] core (prod): 7.1 % de respostas 5xx há 10 min",
    );
    const long = incident(
      grafanaAlert({
        annotations: {
          ...grafanaAlert().annotations,
          summary: "x".repeat(400),
        },
      }),
    );
    expect(ticketSummary(long).length).toBeLessThanOrEqual(255);
  });
  it("marks resolved alerts in the e-mail subject", () => {
    expect(emailSubject(incident())).toBe(
      "[P1] core (prod): 7.1 % de respostas 5xx há 10 min",
    );
    expect(
      emailSubject(incident(grafanaAlert({ status: "resolved" }))),
    ).toMatch(/^\[RESOLVIDO\] \[P1\] /);
  });
  it("splits the numbered first steps", () => {
    expect(splitSteps(incident().firstSteps)).toEqual([
      "Abrir o dashboard do serviço.",
      "Ver os logs de erro.",
      "Checar a última publicação.",
    ]);
    expect(splitSteps("Sem numeração.")).toEqual(["Sem numeração."]);
  });
  it("builds the ticket body with the log window warning and links", () => {
    const body = flat(
      ticketDescription(incident(), {
        occurrence: 3,
        firstAt: new Date("2026-10-29T12:00:00Z"),
      }),
    );
    expect(body).toContain("O que aconteceu");
    expect(body).toContain("Impacto provável");
    expect(body).toContain("Ocorrência nº 3");
    expect(body).toContain("29/10/2026 09:00");
    expect(body).toContain("30 minutos antes e 30 minutos depois");
    expect(body).toContain("30/10/2026 13:06");
    expect(body).toContain("Primeiros passos");
    expect(body).toContain("http://localhost:3000/d/solier-servico-java");
    expect(body).toContain('"panelType":"warning"');
  });
  it("keeps alert text literal in the ticket body", () => {
    const body = flat(
      ticketDescription(
        incident(
          grafanaAlert({
            annotations: {
              ...grafanaAlert().annotations,
              description: "{{ $labels }} <b>x</b> `y`",
            },
          }),
        ),
        { occurrence: 1 },
      ),
    );
    expect(body).toContain("{{ $labels }} <b>x</b> `y`");
  });
  it("builds clean WhatsApp template variables", () => {
    const params = whatsappParameters(
      incident(
        grafanaAlert({
          annotations: {
            ...grafanaAlert().annotations,
            summary: "linha 1\nlinha 2\t  com    espaços",
          },
          labels: grafanaLabels({ service_name: "core" }),
        }),
      ),
    );
    expect(params).toHaveLength(4);
    expect(params[0]).toBe("P1");
    expect(params[1]).toBe("linha 1 linha 2 com espaços");
    expect(params[2]).toBe("core (prod)");
    expect(params[3]).toContain("http://localhost:3000/d/");
    for (const value of params) expect(value).not.toMatch(/[\n\t]|\s{4}/);
  });
});
