import { z } from "zod";
import type { AlertsConfig } from "./alerts.model.js";

type WhatsAppConfig = NonNullable<AlertsConfig["whatsapp"]>;

export interface WhatsAppClient {
  send(to: string, parameters: string[]): Promise<string>;
}

export class WhatsAppRequestError extends Error {
  constructor(
    readonly status: number,
    reason = "request failed",
  ) {
    super(`WhatsApp send failed (${status}): ${reason}`);
  }
}

const answerSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1) })).min(1),
});

export function createWhatsAppClient(
  config: WhatsAppConfig,
  fetchFn: typeof fetch = fetch,
): WhatsAppClient {
  const url = `${config.apiBaseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;
  return {
    async send(to, parameters) {
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.accessToken}`,
            accept: "application/json",
            "content-type": "application/json",
          },
          signal: AbortSignal.timeout(10_000),
          redirect: "error",
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: config.templateName,
              language: { code: config.templateLanguage },
              components: [
                {
                  type: "body",
                  parameters: parameters.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ],
            },
          }),
        });
      } catch {
        throw new WhatsAppRequestError(0, "network error or timeout");
      }
      if (!response.ok) throw new WhatsAppRequestError(response.status);
      const parsed = answerSchema.safeParse(
        await response.json().catch(() => undefined),
      );
      if (!parsed.success)
        throw new WhatsAppRequestError(response.status, "invalid response");
      return parsed.data.messages[0]!.id;
    },
  };
}
