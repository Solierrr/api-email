import {
  EmailAction,
  EmailLayout,
  EmailText,
} from "@solaria.network/web-lib/email";
import { Link } from "react-email";
import type { EmailLocale, EmailRequest } from "../email.schema.js";
import { getEmailContent } from "./email.content.js";

// A fonte do layout desenha o "x" entre dígitos como "×", e "5xx" viraria "5×x". O div só desliga
// essa ligadura; não faz layout.
const plainDigits = { fontFeatureSettings: '"calt" 0, "liga" 0' };

const labels: Record<
  EmailLocale,
  {
    firing: string;
    resolved: string;
    service: string;
    started: string;
    ended: string;
    impact: string;
    timezone: string;
  }
> = {
  "pt-BR": {
    firing: "Alerta",
    resolved: "Alerta resolvido",
    service: "no serviço",
    started: "Início",
    ended: "Fim",
    impact: "Impacto provável",
    timezone: "horário de Brasília",
  },
  "en-US": {
    firing: "Alert",
    resolved: "Alert resolved",
    service: "on service",
    started: "Started",
    ended: "Ended",
    impact: "Likely impact",
    timezone: "Brasília time",
  },
  "es-ES": {
    firing: "Alerta",
    resolved: "Alerta resuelta",
    service: "en el servicio",
    started: "Inicio",
    ended: "Fin",
    impact: "Impacto probable",
    timezone: "hora de Brasilia",
  },
};

// Aviso interno da plataforma, só em texto: quem manda (o worker-alerts) escreve o resumo e o impacto
// já prontos; o template traduz os rótulos e aplica o layout. A única exceção visual é o botão. Sem
// travessão, ponto central, reticências em um caractere nem outros símbolos de texto gerado.
export default function OperationalAlertEmail({
  request,
}: {
  request: EmailRequest;
}) {
  const content = getEmailContent(request.locale, request.template);
  const text = labels[request.locale];
  const { data } = request;
  const firing = data.alertStatus !== "resolved";
  const when = new Intl.DateTimeFormat(request.locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  return (
    <EmailLayout
      locale={request.locale}
      title={content.subject}
      footer={content.footer}
      siteUrl="https://solarianetwork.site"
      privacyUrl="https://solarianetwork.site/pt-BR/politicas/privacidade"
      githubUrl="https://github.com/Solierrr/web-app"
    >
      <div style={plainDigits}>
        <EmailText>{content.introduction}</EmailText>
        <EmailText>
          {firing ? text.firing : text.resolved} {data.alertPriority}{" "}
          {text.service}{" "}
          {data.serviceUrl ? (
            <Link href={data.serviceUrl}>{data.serviceName}</Link>
          ) : (
            data.serviceName
          )}{" "}
          ({data.environment})
        </EmailText>
        <EmailText>{data.summary}</EmailText>
        {data.impact && (
          <EmailText>
            {text.impact}: {data.impact}
          </EmailText>
        )}
        {data.startedAt && (
          <EmailText>
            {text.started}: {when.format(new Date(data.startedAt))} (
            {text.timezone})
          </EmailText>
        )}
        {data.endedAt && (
          <EmailText>
            {text.ended}: {when.format(new Date(data.endedAt))} ({text.timezone}
            )
          </EmailText>
        )}
        {data.actionUrl && (
          <EmailAction href={data.actionUrl} label={content.button} />
        )}
      </div>
    </EmailLayout>
  );
}

// "[P2] core (prod): resumo", com o prefixo [RESOLVIDO] quando o alerta voltou ao normal
export function alertSubject(request: EmailRequest): string {
  const { data } = request;
  const prefix =
    data.alertStatus === "resolved"
      ? {
          "pt-BR": "[RESOLVIDO] ",
          "en-US": "[RESOLVED] ",
          "es-ES": "[RESUELTO] ",
        }[request.locale]
      : "";
  const subject = `${prefix}[${data.alertPriority}] ${data.serviceName} (${data.environment}): ${data.summary}`;
  return subject.length <= 200 ? subject : `${subject.slice(0, 197)}...`;
}
