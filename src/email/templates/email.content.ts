import type { EmailLocale, EmailTemplate } from "../email.schema.js";
import translations from "./email.translations.json" with { type: "json" };

interface Content {
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
    Pick<Content, "subject" | "introduction" | "button"> &
      Partial<Pick<Content, "footer">>
  >
> = translations.templates;

export function getEmailContent(
  locale: EmailLocale,
  template: EmailTemplate,
): Content {
  return { ...shared[locale], ...templates[locale][template] };
}
