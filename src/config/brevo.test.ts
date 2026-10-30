import { afterEach, expect, it, vi } from "vitest";
import { createBrevoTransport } from "./brevo.js";
import { readConfig } from "./config.js";

const config = readConfig({
  EMAIL_API_KEY: "internal-test-key-12345678901234567890",
  EMAIL_TRANSPORT: "brevo",
  BREVO_API_KEY: "provider-test-key",
  EMAIL_FROM: "support@example.com",
  EMAIL_ALLOWED_ORIGINS: "https://example.com",
  APP_ENV: "qa",
});
const message = {
  from: config.EMAIL_FROM,
  to: "recipient@example.com",
  subject: "Teste",
  html: '<p>Olá</p><img src="data:image/png;base64,aGVsbG8=">',
  text: "Olá",
};
afterEach(() => vi.unstubAllGlobals());

it("sends rendered templates over HTTPS and preserves embedded images", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ messageId: "test-message" }, { status: 201 }),
    );
  vi.stubGlobal("fetch", fetchMock);
  expect(await createBrevoTransport(config).send(message)).toBe("test-message");
  const [url, options] = fetchMock.mock.calls[0]!;
  expect(url).toBe("https://api.brevo.com/v3/smtp/email");
  expect(options.headers["api-key"]).toBe(config.BREVO_API_KEY);
  expect(options.redirect).toBe("error");
  expect(JSON.parse(options.body)).toEqual({
    sender: { email: message.from, name: "Solaria" },
    to: [{ email: message.to }],
    subject: message.subject,
    htmlContent: '<p>Olá</p><img src="cid:solaria-image-0.png">',
    textContent: message.text,
    attachment: [{ name: "solaria-image-0.png", content: "aGVsbG8=" }],
  });
});

it.each([401, 429, 500])(
  "does not retry or expose provider errors (%s)",
  async (status) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "provider-test-key" }, { status }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(createBrevoTransport(config).send(message)).rejects.toThrow(
      "Email provider rejected the request",
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  },
);

it("rejects acceptance responses without a message ID", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
  await expect(createBrevoTransport(config).send(message)).rejects.toThrow(
    "invalid response",
  );
});

it("checks transactional API access without sending an email", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({ senders: [{ email: config.EMAIL_FROM, active: true }] }),
    );
  vi.stubGlobal("fetch", fetchMock);
  await createBrevoTransport(config).verify();
  expect(fetchMock.mock.calls[0]![0]).toBe(
    "https://api.brevo.com/v3/smtp/statistics/aggregatedReport?days=1",
  );
  expect(fetchMock.mock.calls[0]![1]).not.toHaveProperty("body");
});

it("keeps readiness unavailable when API access is denied", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({}, { status: 401 })),
  );
  await expect(createBrevoTransport(config).verify()).rejects.toThrow(
    "provider is unavailable",
  );
});
