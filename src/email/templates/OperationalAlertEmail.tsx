import {
  EmailAction,
  EmailLayout,
  EmailText,
} from "@solaria.network/web-lib/email";
import { Link } from "react-email";
import type { EmailLocale, EmailRequest } from "../email.schema.js";
import { formatSubject, getEmailContent } from "./email.content.js";

// A fonte do layout desenha o "x" entre dígitos como "×", e "5xx" viraria "5×x". O div só desliga
// essa ligadura; não faz layout.
const plainDigits = { fontFeatureSettings: '"calt" 0, "liga" 0' };

const labels: Record<
  EmailLocale,
  {
    firing: string;
    resolved: string;
    service: string;
    environment: string;
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
    environment: "em",
    started: "Início",
    ended: "Fim",
    impact: "Impacto provável",
    timezone: "horário de Brasília",
  },
  "en-US": {
    firing: "Alert",
    resolved: "Alert resolved",
    service: "on service",
    environment: "in",
    started: "Started",
    ended: "Ended",
    impact: "Likely impact",
    timezone: "Brasília time",
  },
  "es-ES": {
    firing: "Alerta",
    resolved: "Alerta resuelta",
    service: "en el servicio",
    environment: "en",
    started: "Inicio",
    ended: "Fin",
    impact: "Impacto probable",
    timezone: "hora de Brasilia",
  },
};

// O ambiente por extenso, no idioma do e-mail; um ambiente fora da lista aparece com o próprio nome
const environments: Record<EmailLocale, Record<string, string>> = {
  "pt-BR": {
    prod: "ambiente produtivo",
    qa: "ambiente de QA",
    dev: "ambiente de desenvolvimento",
  },
  "en-US": {
    prod: "production environment",
    qa: "QA environment",
    dev: "development environment",
  },
  "es-ES": {
    prod: "entorno productivo",
    qa: "entorno de QA",
    dev: "entorno de desarrollo",
  },
};
const environmentName = (locale: EmailLocale, environment: string) =>
  environments[locale][environment] ??
  { "pt-BR": "ambiente", "en-US": "environment", "es-ES": "entorno" }[locale] +
    ` ${environment}`;

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
          {text.environment}{" "}
          {environmentName(request.locale, data.environment!)}
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

// "[Alerta: P2] api-core em ambiente produtivo: resumo", ou "[Alerta resolvido: P2] ..." quando voltou
export function alertSubject(request: EmailRequest): string {
  const { data } = request;
  const text = labels[request.locale];
  const purpose = `${data.alertStatus === "resolved" ? text.resolved : text.firing}: ${data.alertPriority}`;
  const title = `${data.serviceName} ${text.environment} ${environmentName(request.locale, data.environment!)}: ${data.summary}`;
  const subject = formatSubject(purpose, title);
  return subject.length <= 200 ? subject : `${subject.slice(0, 197)}...`;
}
