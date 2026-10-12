import nodemailer from "nodemailer";
import type { EmailConfig } from "./config.js";
import type { EmailTransport } from "../email/email.service.js";

export function createSmtpTransport(config: EmailConfig): EmailTransport {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    requireTLS: config.APP_ENV !== "dev" && !config.SMTP_SECURE,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
    attachDataUrls: true,
  });
  return {
    async send(message) {
      const result = await transport.sendMail(message);
      if (!result.accepted.length || result.rejected.length)
        throw new Error("Recipient rejected");
      return result.messageId;
    },
    async verify() {
      await transport.verify();
    },
    close() {
      transport.close();
    },
  };
}
