import {
  EmailAction,
  EmailLayout,
  EmailText,
} from "@solaria.network/web-lib/email";
import { getEmailContent } from "./email.content.js";
import type { EmailRequest } from "../email.schema.js";
import { DetailCard } from "../components/DetailCard.js";
import { solarPlaceholder } from "../components/solar-placeholder.js";
import { Text } from "react-email";

export default function ActionEmail({ request }: { request: EmailRequest }) {
  const content = getEmailContent(request.locale, request.template);
  const labels = {
    "pt-BR": {
      project: "Projeto",
      role: "Papel",
      expires: "Convite válido até",
      model: "Modelo aprovado",
      company: "Empresa",
      reason: "Motivo da reprovação",
      status: "Aprovado",
    },
    "en-US": {
      project: "Project",
      role: "Role",
      expires: "Invitation valid until",
      model: "Approved model",
      company: "Company",
      reason: "Rejection reason",
      status: "Approved",
    },
    "es-ES": {
      project: "Proyecto",
      role: "Rol",
      expires: "Invitación válida hasta",
      model: "Modelo aprobado",
      company: "Empresa",
      reason: "Motivo del rechazo",
      status: "Aprobado",
    },
  }[request.locale];
  const webPaths = {
    "pt-BR": { privacy: "/pt-BR/politicas/privacidade" },
    "en-US": { privacy: "/en-US/policies/privacy" },
    "es-ES": { privacy: "/es-ES/politicas/privacidad" },
  }[request.locale];
  const siteUrl = "https://solarianetwork.site";
  const supportEmail = "solaria.innetwork@gmail.com";
  const footer =
    request.template === "user-deletion"
      ? {
          "pt-BR": (
            <>
              Não reconhece esta exclusão? Comunique-se conosco em{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>!
            </>
          ),
          "en-US": (
            <>
              Don't recognize this deletion? Contact us at{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>!
            </>
          ),
          "es-ES": (
            <>
              ¿No reconoces esta eliminación? Comunícate con nosotros en{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>!
            </>
          ),
        }[request.locale]
      : content.footer;
  return (
    <EmailLayout
      locale={request.locale}
      title={content.subject}
      footer={footer}
      siteUrl={siteUrl}
      privacyUrl={`${siteUrl}${webPaths.privacy}`}
      githubUrl="https://github.com/Solierrr/web-app"
    >
      {request.data.name && (
        <EmailText>
          {content.greeting}, {request.data.name}!
        </EmailText>
      )}
      <EmailText>{content.introduction}</EmailText>
      {request.template === "project-invitation" && (
        <>
          <EmailText>
            {labels.project}: {request.data.projectName}
          </EmailText>
          <EmailText>
            {labels.role}:{" "}
            {
              {
                "pt-BR": {
                  MANAGER: "Gestor",
                  MEMBER: "Participante",
                  VIEWER: "Observador",
                },
                "en-US": {
                  MANAGER: "Manager",
                  MEMBER: "Participant",
                  VIEWER: "Viewer",
                },
                "es-ES": {
                  MANAGER: "Gestor",
                  MEMBER: "Participante",
                  VIEWER: "Observador",
                },
              }[request.locale][request.data.projectRole!]
            }
          </EmailText>
          <EmailText>
            {labels.expires}:{" "}
            {new Intl.DateTimeFormat(request.locale, {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "UTC",
            }).format(new Date(request.data.invitationExpiresAt!))}{" "}
            UTC
          </EmailText>
        </>
      )}
      {["company-invitation", "company-email-verification"].includes(
        request.template,
      ) &&
        request.data.companyName &&
        (request.data.companyLogoUrl ? (
          <DetailCard
            label={labels.company}
            title={request.data.companyName}
            image={request.data.companyLogoUrl}
          />
        ) : (
          <EmailText>
            {labels.company}: {request.data.companyName}
          </EmailText>
        ))}
      {request.template === "solar-model-approved" &&
        request.data.modelName && (
          <DetailCard
            label={labels.model}
            title={request.data.modelName}
            image={request.data.modelImageUrl ?? solarPlaceholder}
          >
            {(request.data.modelManufacturer ||
              request.data.modelPowerWatts) && (
              <Text className="m-0 mb-4 text-[13px] text-gray">
                {[
                  request.data.modelManufacturer,
                  request.data.modelPowerWatts
                    ? `${request.data.modelPowerWatts} W`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            )}
            <Text className="m-0 text-xs font-semi-bold text-black">
              {labels.status}
            </Text>
          </DetailCard>
        )}
      {request.data.reason && (
        <EmailText>
          {labels.reason}: {request.data.reason}
        </EmailText>
      )}
      {request.data.actionUrl && request.template !== "user-deletion" && (
        <EmailAction href={request.data.actionUrl} label={content.button} />
      )}
    </EmailLayout>
  );
}
