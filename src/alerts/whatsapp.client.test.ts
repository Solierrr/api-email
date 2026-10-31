import { describe, expect, it, vi } from "vitest";
import { readConfig } from "../config/config.js";
import {
  createWhatsAppClient,
  WhatsAppRequestError,
} from "./whatsapp.client.js";

const { whatsapp } = readConfig({
  SERVICE_KEY_API_CORE: "test-key-only-not-a-secret-1234567890",
  EMAIL_FROM: "noreply@example.com",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
  WHATSAPP_ACCESS_TOKEN: "whatsapp-test-token-only",
  WHATSAPP_PHONE_NUMBER_ID: "1234567890",
  WHATSAPP_TEMPLATE_NAME: "solier_alerta",
  WHATSAPP_ALERT_TO: "5511912345678",
}).alerts;
if (!whatsapp) throw new Error("WhatsApp config expected");

const reply = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("WhatsApp client", () => {
  it("sends the approved template with the parameters in order", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(reply(200, { messages: [{ id: "wamid.ABC" }] }));
    const id = await createWhatsAppClient(whatsapp, fetchFn).send(
      "5511912345678",
      ["P1", "core fora do ar", "core (prod)", "https://grafana.example/d/x"],
    );
    expect(id).toBe("wamid.ABC");
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://graph.facebook.com/v23.0/1234567890/messages");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer whatsapp-test-token-only",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      messaging_product: "whatsapp",
      to: "5511912345678",
      type: "template",
      template: {
        name: "solier_alerta",
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "P1" },
              { type: "text", text: "core fora do ar" },
              { type: "text", text: "core (prod)" },
              { type: "text", text: "https://grafana.example/d/x" },
            ],
          },
        ],
      },
    });
  });
  it("reports failures by status without the provider body or the token", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(reply(401, { error: { message: "secret detail" } }));
    const failure = await createWhatsAppClient(whatsapp, fetchFn)
      .send("5511912345678", ["a", "b", "c", "d"])
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(WhatsAppRequestError);
    expect(failure).toMatchObject({ status: 401 });
    expect(String((failure as Error).message)).not.toMatch(/secret|token/);
  });
  it("rejects an answer without a message id and network failures", async () => {
    await expect(
      createWhatsAppClient(
        whatsapp,
        vi.fn().mockResolvedValue(reply(200, { messages: [] })),
      ).send("5511912345678", ["a", "b", "c", "d"]),
    ).rejects.toBeInstanceOf(WhatsAppRequestError);
    await expect(
      createWhatsAppClient(
        whatsapp,
        vi.fn().mockRejectedValue(new Error("offline")),
      ).send("5511912345678", ["a", "b", "c", "d"]),
    ).rejects.toMatchObject({ status: 0 });
  });
});

describe("WhatsApp client base URL", () => {
  it("calls the configured API base URL", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(reply(200, { messages: [{ id: "wamid.X" }] }));
    await createWhatsAppClient(
      { ...whatsapp, apiBaseUrl: "http://localhost:8089" },
      fetchFn,
    ).send("5511912345678", ["a", "b", "c", "d"]);
    expect(fetchFn.mock.calls[0]![0]).toBe(
      "http://localhost:8089/v23.0/1234567890/messages",
    );
  });
});
