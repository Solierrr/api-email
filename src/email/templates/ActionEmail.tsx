import { EmailAction, EmailLayout, EmailText } from "@solierrr/web-lib/email";
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
  return (
    <EmailLayout
      locale={request.locale}
      title={content.subject}
      footer={content.footer}
    >
      {request.data.name && (
        <EmailText>
          {content.greeting}, {request.data.name}!
        </EmailText>
      )}
      <EmailText>{content.introduction}</EmailText>
      {request.template === "project-invitation" && (
        <>
          <DetailCard
            label={labels.project}
            title={request.data.projectName!}
          />
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
        request.data.companyName && (
          <DetailCard label={labels.company} title={request.data.companyName} />
        )}
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
                  .join(" · ")}
              </Text>
            )}
            <Text className="m-0 text-xs font-semi-bold text-black">
              ✓ {labels.status}
            </Text>
          </DetailCard>
        )}
      {request.data.reason && (
        <DetailCard label={labels.reason}>
          <EmailText>{request.data.reason}</EmailText>
        </DetailCard>
      )}
      {request.data.actionUrl && request.template !== "user-deletion" && (
        <EmailAction
          href={request.data.actionUrl}
          label={content.button}
          fallback={content.fallback}
        />
      )}
    </EmailLayout>
  );
}
