import type { EmailConfig } from "./config.js";
import type { EmailTransport } from "../email/email.service.js";

export function createBrevoTransport(config: EmailConfig): EmailTransport {
  if (!config.BREVO_API_KEY) throw new Error("BREVO_API_KEY is required");
  const headers = {
    "api-key": config.BREVO_API_KEY,
    "content-type": "application/json",
    accept: "application/json",
  };
  return {
    async send(message) {
      const attachment: { name: string; content: string }[] = [];
      const htmlContent = message.html.replace(
        /src=(["'])data:image\/(png|gif|jpeg);base64,([A-Za-z0-9+/=]+)\1/g,
        (_match, _quote: string, format: string, content: string) => {
          const name = `solaria-image-${attachment.length}.${format}`;
          attachment.push({ name, content });
          return `src="cid:${name}"`;
        },
      );
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        body: JSON.stringify({
          sender: { email: message.from, name: "Solaria" },
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent,
          textContent: message.text,
          ...(attachment.length ? { attachment } : {}),
        }),
      });
      if (!response.ok) throw new Error("Email provider rejected the request");
      const result: unknown = await response.json();
      if (
        !result ||
        typeof result !== "object" ||
        !("messageId" in result) ||
        typeof result.messageId !== "string" ||
        !result.messageId
      )
        throw new Error("Email provider returned an invalid response");
      return result.messageId;
    },
    async verify() {
      const response = await fetch(
        "https://api.brevo.com/v3/smtp/statistics/aggregatedReport?days=1",
        {
          headers,
          signal: AbortSignal.timeout(5000),
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("Email provider is unavailable");
    },
    close() {},
  };
}
