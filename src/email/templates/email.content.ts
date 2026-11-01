import type { EmailLocale, EmailTemplate } from "../email.schema.js";
import translations from "./email.translations.json" with { type: "json" };

interface Content {
  purpose: string;
  subject: string;
  introduction: string;
  button: string;
  footer: string;
  greeting: string;
}

const shared: Record<
  EmailLocale,
  Pick<Content, "footer" | "greeting">
> = translations.shared;
const templates: Record<
  EmailLocale,
  Record<
    EmailTemplate,
    Pick<Content, "purpose" | "subject" | "introduction" | "button"> &
      Partial<Pick<Content, "footer">>
  >
> = translations.templates;

export function getEmailContent(
  locale: EmailLocale,
  template: EmailTemplate,
): Content {
  return { ...shared[locale], ...templates[locale][template] };
}

// Assunto no formato "[finalidade] título", por exemplo "[Conta] Confirmação de e-mail". O título é o
// mesmo que aparece no topo do e-mail; a finalidade ajuda a filtrar a caixa de entrada.
export function formatSubject(purpose: string, title: string): string {
  return `[${purpose}] ${title}`;
}
