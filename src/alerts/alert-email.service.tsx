import { render, toPlainText } from "react-email";
import type { EmailTransport } from "../email/email.service.js";
import AlertEmail from "./AlertEmail.js";
import { emailSubject } from "./alerts.content.js";
import type { Incident } from "./alerts.model.js";

export async function renderAlertEmail(incident: Incident) {
  const subject = emailSubject(incident);
  const html = await render(<AlertEmail incident={incident} />);
  return { subject, html, text: toPlainText(html) };
}

// One message per recipient: a failure for one address must not hide the others
export async function sendAlertEmail(
  incidents: Incident[],
  recipients: string[],
  from: string,
  transport: EmailTransport,
) {
  let sent = 0;
  let failed = 0;
  for (const incident of incidents) {
    const email = await renderAlertEmail(incident);
    for (const to of recipients) {
      try {
        await transport.send({ ...email, from, to });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
  }
  return { sent, failed };
}
