import { render, toPlainText } from "react-email";
import ActionEmail from "./templates/ActionEmail.js";
import OperationalAlertEmail, {
  alertSubject,
} from "./templates/OperationalAlertEmail.js";
import { getEmailContent } from "./templates/email.content.js";
import type { EmailRequest } from "./email.schema.js";

export interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}
export interface EmailTransport {
  send(message: EmailMessage): Promise<string>;
  verify(): Promise<void>;
  close(): void;
}

// A versão em texto não pode pôr os títulos em caixa alta (o padrão do conversor)
const plainTextOptions = {
  selectors: ["h1", "h2", "h3", "h4", "h5", "h6"].map((selector) => ({
    selector,
    options: { uppercase: false },
  })),
};

export async function renderEmail(request: EmailRequest) {
  const alert = request.template === "operational-alert";
  const html = await render(
    alert ? (
      <OperationalAlertEmail request={request} />
    ) : (
      <ActionEmail request={request} />
    ),
  );
  return {
    subject: alert
      ? alertSubject(request)
      : getEmailContent(request.locale, request.template).subject,
    html,
    text: toPlainText(html, plainTextOptions),
  };
}

export async function sendEmail(
  request: EmailRequest,
  from: string,
  transport: EmailTransport,
) {
  const email = await renderEmail(request);
  const messageId = await transport.send({ ...email, from, to: request.to });
  return { status: "accepted" as const, messageId };
}
