import { EmailAction, EmailLayout, EmailText } from "@solierrr/web-lib/email";
import { Link, Text } from "react-email";
import { DetailCard } from "../email/components/DetailCard.js";
import { logsWarning, splitSteps, whenLines } from "./alerts.content.js";
import type { Incident } from "./alerts.model.js";

// The layout font draws an "x" between digits as "×", which turns "5xx" into "5×x" in an alert about 5xx errors
const plainDigits = { fontFeatureSettings: '"calt" 0, "liga" 0' };

// Alert e-mails are for the dev team, so they exist in pt-BR only
export default function AlertEmail({ incident }: { incident: Incident }) {
  const { links } = incident;
  const steps = splitSteps(incident.firstSteps);
  return (
    <EmailLayout
      locale="pt-BR"
      title={`Alerta ${incident.priority}${incident.firing ? "" : " resolvido"}: ${incident.service}`}
      footer="Aviso automático do Grafana do SOLIER. Não responda a este e-mail."
    >
      <div style={plainDigits}>
        <EmailText>
          {incident.firing
            ? "Um alerta do SOLIER precisa de atenção."
            : "O alerta voltou ao normal."}
        </EmailText>
        <DetailCard
          label={`Prioridade ${incident.priority}`}
          title={incident.summary}
        >
          <Text className="m-0 mb-1 text-[13px] text-gray">
            {incident.service} ({incident.environment})
          </Text>
          {whenLines(incident).map((line) => (
            <Text key={line} className="m-0 mb-1 text-[13px] text-gray">
              {line}
            </Text>
          ))}
        </DetailCard>
        {incident.description && <EmailText>{incident.description}</EmailText>}
        {incident.impact && (
          <DetailCard label="Impacto provável">
            <EmailText>{incident.impact}</EmailText>
          </DetailCard>
        )}
        {steps.length > 0 && (
          <DetailCard label="Primeiros passos">
            {steps.map((step, index) => (
              <EmailText key={step}>
                {index + 1}. {step}
              </EmailText>
            ))}
          </DetailCard>
        )}
        <EmailText>{logsWarning(incident)}</EmailText>
        {links.logs && (
          <EmailText>
            <Link href={links.logs}>Abrir os logs de erro no Grafana</Link>
          </EmailText>
        )}
        {links.traces && (
          <EmailText>
            <Link href={links.traces}>Abrir os traces com erro no Grafana</Link>
          </EmailText>
        )}
        {links.dashboard && (
          <EmailAction
            href={links.dashboard}
            label="Abrir o dashboard do serviço"
            fallback="Se o botão não abrir, copie o endereço abaixo:"
          />
        )}
      </div>
    </EmailLayout>
  );
}
