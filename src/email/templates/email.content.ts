import type { EmailLocale, EmailTemplate } from "../email.schema.js";

interface Content {
  subject: string;
  introduction: string;
  button: string;
  footer: string;
  greeting: string;
  fallback: string;
}
const shared = {
  "pt-BR": {
    footer: "Se você não solicitou esta ação, ignore este e-mail.",
    greeting: "Olá",
    fallback: "Se o botão não funcionar, copie e abra este link:",
  },
  "en-US": {
    footer: "If you did not request this action, ignore this email.",
    greeting: "Hello",
    fallback: "If the button does not work, copy and open this link:",
  },
  "es-ES": {
    footer: "Si no solicitaste esta acción, ignora este correo.",
    greeting: "Hola",
    fallback: "Si el botón no funciona, copia y abre este enlace:",
  },
};
const templates: Record<
  EmailLocale,
  Record<
    EmailTemplate,
    Pick<Content, "subject" | "introduction" | "button"> &
      Partial<Pick<Content, "footer">>
  >
> = {
  "pt-BR": {
    "project-invitation": {
      subject: "Convite para um projeto na Solaria",
      introduction:
        "Você foi convidado para participar do projeto abaixo. Aceite ou recuse o convite com a conta correspondente ao e-mail destinatário.",
      button: "Ver convite",
    },
    "user-deletion": {
      subject: "Sua conta na Solaria foi excluída",
      introduction:
        "A exclusão da sua conta foi concluída. Este e-mail confirma o encerramento do seu acesso à Solaria.",
      button: "",
      footer:
        "Se você não reconhece esta exclusão, entre em contato com o suporte da Solaria.",
    },
    "registration-approved": {
      subject: "Seu cadastro foi aprovado",
      introduction:
        "A análise do seu cadastro foi concluída e ele foi aprovado. Acesse a Solaria para consultar seu perfil.",
      button: "Ver meu cadastro",
      footer:
        "Você recebeu este aviso sobre a análise do seu cadastro na Solaria.",
    },
    "registration-rejected": {
      subject: "Seu cadastro foi reprovado",
      introduction:
        "Seu cadastro não foi aprovado na análise. Confira o motivo abaixo e consulte os detalhes na Solaria.",
      button: "Ver meu cadastro",
      footer:
        "Este aviso se refere à análise do seu cadastro; ele não significa exclusão da sua conta.",
    },
    "solar-model-approved": {
      subject: "Seu modelo de placa solar foi aprovado",
      introduction:
        "O modelo de placa solar abaixo foi aprovado na análise da Solaria.",
      button: "Ver modelo",
      footer:
        "Você recebeu este aviso sobre a análise do seu modelo de placa solar.",
    },
    "company-email-verification": {
      subject: "Confirme o novo e-mail da empresa",
      introduction:
        "Recebemos uma solicitação de alteração do e-mail corporativo da empresa abaixo. Verifique este endereço para continuar o processo; a verificação não substitui a aprovação administrativa.",
      button: "Verificar novo e-mail",
      footer:
        "Se você não solicitou esta alteração, contate o administrador da empresa.",
    },
    "email-verification": {
      subject: "Confirme seu e-mail na Solaria",
      introduction:
        "Confirme seu e-mail para continuar usando sua conta na Solaria.",
      button: "Confirmar e-mail",
    },
    "password-reset": {
      subject: "Redefina sua senha na Solaria",
      introduction:
        "Recebemos uma solicitação para redefinir sua senha. Use o botão abaixo para escolher uma nova senha.",
      button: "Redefinir senha",
    },
    "company-invitation": {
      subject: "Convite para uma empresa na Solaria",
      introduction:
        "Você recebeu um convite para integrar a equipe de uma empresa na Solaria.",
      button: "Ver convite",
    },
  },
  "en-US": {
    "project-invitation": {
      subject: "You are invited to a Solaria project",
      introduction:
        "You have been invited to the project below. Accept or decline using the account matching the recipient email.",
      button: "View invitation",
    },
    "user-deletion": {
      subject: "Your Solaria account has been deleted",
      introduction:
        "Your account deletion is complete. This email confirms the end of your access to Solaria.",
      button: "",
      footer: "If you do not recognize this deletion, contact Solaria support.",
    },
    "registration-approved": {
      subject: "Your registration was approved",
      introduction:
        "Your registration review is complete and it was approved. Open Solaria to check your profile.",
      button: "View registration",
      footer:
        "You received this notice about your Solaria registration review.",
    },
    "registration-rejected": {
      subject: "Your registration was rejected",
      introduction:
        "Your registration was not approved during review. Check the reason below and view the details on Solaria.",
      button: "View registration",
      footer:
        "This registration review notice does not mean your account was deleted.",
    },
    "solar-model-approved": {
      subject: "Your solar panel model was approved",
      introduction:
        "The solar panel model below was approved during Solaria review.",
      button: "View model",
      footer: "You received this notice about your solar panel model review.",
    },
    "company-email-verification": {
      subject: "Confirm the company's new email",
      introduction:
        "We received a request to change the corporate email for the company below. Verify this address to continue; verification does not replace administrative approval.",
      button: "Verify new email",
      footer:
        "If you did not request this change, contact your company administrator.",
    },
    "email-verification": {
      subject: "Confirm your email on Solaria",
      introduction:
        "Confirm your email to continue using your Solaria account.",
      button: "Confirm email",
    },
    "password-reset": {
      subject: "Reset your Solaria password",
      introduction:
        "We received a request to reset your password. Use the button below to choose a new password.",
      button: "Reset password",
    },
    "company-invitation": {
      subject: "Company invitation on Solaria",
      introduction: "You have been invited to join a company team on Solaria.",
      button: "View invitation",
    },
  },
  "es-ES": {
    "project-invitation": {
      subject: "Invitación a un proyecto de Solaria",
      introduction:
        "Te invitaron al proyecto indicado abajo. Acepta o rechaza con la cuenta correspondiente al correo destinatario.",
      button: "Ver invitación",
    },
    "user-deletion": {
      subject: "Tu cuenta de Solaria ha sido eliminada",
      introduction:
        "La eliminación de tu cuenta se ha completado. Este correo confirma el fin de tu acceso a Solaria.",
      button: "",
      footer:
        "Si no reconoces esta eliminación, contacta con el soporte de Solaria.",
    },
    "registration-approved": {
      subject: "Tu registro fue aprobado",
      introduction:
        "La revisión de tu registro ha finalizado y fue aprobado. Abre Solaria para consultar tu perfil.",
      button: "Ver registro",
      footer:
        "Has recibido este aviso sobre la revisión de tu registro en Solaria.",
    },
    "registration-rejected": {
      subject: "Tu registro fue rechazado",
      introduction:
        "Tu registro no fue aprobado durante la revisión. Consulta el motivo abajo y los detalles en Solaria.",
      button: "Ver registro",
      footer:
        "Este aviso de revisión no significa que tu cuenta haya sido eliminada.",
    },
    "solar-model-approved": {
      subject: "Tu modelo de panel solar fue aprobado",
      introduction:
        "El modelo de panel solar indicado abajo fue aprobado durante la revisión de Solaria.",
      button: "Ver modelo",
      footer:
        "Has recibido este aviso sobre la revisión de tu modelo de panel solar.",
    },
    "company-email-verification": {
      subject: "Confirma el nuevo correo de la empresa",
      introduction:
        "Recibimos una solicitud de cambio del correo corporativo de la empresa indicada abajo. Verifica esta dirección para continuar; la verificación no sustituye la aprobación administrativa.",
      button: "Verificar nuevo correo",
      footer:
        "Si no solicitaste este cambio, contacta con el administrador de tu empresa.",
    },
    "email-verification": {
      subject: "Confirma tu correo en Solaria",
      introduction:
        "Confirma tu correo para seguir usando tu cuenta de Solaria.",
      button: "Confirmar correo",
    },
    "password-reset": {
      subject: "Restablece tu contraseña de Solaria",
      introduction:
        "Recibimos una solicitud para restablecer tu contraseña. Usa el botón para elegir una nueva.",
      button: "Restablecer contraseña",
    },
    "company-invitation": {
      subject: "Invitación a una empresa en Solaria",
      introduction:
        "Has recibido una invitación para unirte al equipo de una empresa en Solaria.",
      button: "Ver invitación",
    },
  },
};
export function getEmailContent(
  locale: EmailLocale,
  template: EmailTemplate,
): Content {
  return { ...shared[locale], ...templates[locale][template] };
}
