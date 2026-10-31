import { z } from "zod";

export const priorities = ["P1", "P2", "P3", "P4", "P5"] as const;
export type Priority = (typeof priorities)[number];

const identifier = z.string().regex(/^[A-Za-z0-9_.-]{1,80}$/);
const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

const alertLabelsSchema = z.looseObject({
  alert_id: z.string().regex(/^[A-Za-z0-9_-]{1,20}$/),
  priority: z.enum(priorities),
  service_name: identifier,
  deployment_environment: identifier,
  category: slug.optional(),
  escalation_group: slug.optional(),
  alertname: z.string().max(200).optional(),
});

const alertSchema = z.looseObject({
  status: z.enum(["firing", "resolved"]),
  labels: alertLabelsSchema,
  annotations: z.record(z.string(), z.string().max(4000)).optional(),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }).optional(),
  fingerprint: z.string().max(100).optional(),
});

export const grafanaWebhookSchema = z
  .looseObject({
    alerts: z.array(alertSchema).min(1).max(50),
  })
  .meta({
    id: "GrafanaWebhook",
    description:
      "Payload padrão do webhook do Grafana. Campos desconhecidos são ignorados; cada alerta precisa dos rótulos alert_id, priority, service_name e deployment_environment.",
    examples: [
      {
        alerts: [
          {
            status: "firing",
            labels: {
              alert_id: "A03",
              alertname: "A03 Erros 5xx sustentados",
              category: "erros",
              deployment_environment: "prod",
              escalation_group: "erro-5xx",
              priority: "P1",
              service_name: "core",
            },
            annotations: {
              summary: "core (prod): 7.1 % de respostas 5xx há 10 min",
              impact:
                "Pelo menos 1 em cada 20 requisições falha há 10 minutos.",
              first_steps: "1. Abrir o dashboard. 2. Ver os logs de erro.",
              dashboard:
                "/d/solier-servico-java?var-service=core&var-environment=prod",
            },
            startsAt: "2026-10-30T16:06:30Z",
            endsAt: "0001-01-01T00:00:00Z",
          },
        ],
      },
    ],
  });

export type GrafanaWebhook = z.infer<typeof grafanaWebhookSchema>;
export type GrafanaAlert = GrafanaWebhook["alerts"][number];
