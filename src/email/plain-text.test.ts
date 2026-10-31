import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emailSchema, emailTemplates } from "./email.schema.js";
import { renderEmail } from "./email.service.js";

const folder = new URL("../../assets/mocks/emails/", import.meta.url);
const mock = (name: string, patch: Record<string, unknown> = {}) => {
  const body = JSON.parse(
    readFileSync(new URL(`${name}.json`, folder), "utf8"),
  );
  return emailSchema.parse({ ...body, data: { ...body.data, ...patch } });
};

// O layout sempre desenha a logo no topo; o resto das imagens é o que o corpo mostra
const images = (html: string) => (html.match(/<img/g) ?? []).length;
const layoutImages = async () =>
  images((await renderEmail(mock("email-verification"))).html);

describe("plain text pattern", () => {
  it("has an example for every template, which is what the gallery shows", () => {
    const files = readdirSync(folder)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();
    expect(files).toEqual([...emailTemplates].sort());
  });
  it.each(emailTemplates)(
    "%s has no uppercase or letter spaced text in any language",
    async (template) => {
      for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
        const request = emailSchema.parse({ ...mock(template), locale });
        const { html } = await renderEmail(request);
        expect(html).not.toMatch(/text-transform:\s*uppercase/i);
        expect(html).not.toMatch(/letter-spacing/i);
      }
    },
  );
  it.each(emailTemplates)(
    "%s has no dash, middle dot, bullet, ellipsis or check mark in any language",
    async (template) => {
      for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
        const request = emailSchema.parse({ ...mock(template), locale });
        const email = await renderEmail(request);
        const body = `${email.subject}
${email.text}
${email.html}`;
        expect(body).not.toMatch(/[—–·•…✓→]/);
      }
    },
  );
  it.each(emailTemplates)(
    "%s does not name the project in the text, in any language",
    async (template) => {
      for (const locale of ["pt-BR", "en-US", "es-ES"] as const) {
        const request = emailSchema.parse({ ...mock(template), locale });
        const { subject, text } = await renderEmail(request);
        // Endereços e URLs ficam de fora: o domínio é a única referência permitida
        const words = `${subject}
${text}`
          .replace(/https?:\/\/\S+/g, "")
          .replace(/\S+@\S+/g, "");
        expect(words).not.toMatch(/solaria|solier/i);
      }
    },
  );
  it("shows the company name as plain text when there is no logo", async () => {
    const request = mock("company-invitation");
    delete (request.data as Record<string, unknown>).companyLogoUrl;
    const { html, text } = await renderEmail(request);
    expect(images(html)).toBe(await layoutImages());
    expect(text).toContain("Empresa: Aurora Energia");
  });
  it("shows the company card with the logo when there is one", async () => {
    for (const template of [
      "company-invitation",
      "company-email-verification",
    ]) {
      const { html } = await renderEmail(mock(template));
      expect(images(html)).toBe((await layoutImages()) + 1);
      expect(html).toContain("enterprises-logos-54b4ae9664e9.webp");
      expect(html).toContain("Empresa");
    }
  });
  it("keeps the card only for the items that have an image", async () => {
    const project = await renderEmail(mock("project-invitation"));
    expect(images(project.html)).toBe(await layoutImages());
    expect(project.text).toContain("Projeto:");
    const rejected = await renderEmail(mock("registration-rejected"));
    expect(images(rejected.html)).toBe(await layoutImages());
    expect(rejected.text).toContain("Motivo da reprovação:");
    const model = await renderEmail(mock("solar-model-approved"));
    expect(images(model.html)).toBe((await layoutImages()) + 1);
  });
});

describe("company logo contract", () => {
  const base = JSON.parse(
    readFileSync(new URL("company-invitation.json", folder), "utf8"),
  );
  it.each([
    "http://example.com/logo.png",
    "https://user:pass@example.com/logo.png",
    "ftp://example.com/logo.png",
    "not a url",
  ])("rejects an unsafe logo %s", (companyLogoUrl) => {
    const result = emailSchema.safeParse({
      ...base,
      data: { ...base.data, companyLogoUrl },
    });
    expect(result.success).toBe(false);
  });
});

describe("text version", () => {
  it.each(emailTemplates)(
    "%s keeps the headings in normal case in the plain text",
    async (template) => {
      const { text } = await renderEmail(mock(template));
      const firstLine = text.split("\n")[0]!.trim();
      expect(firstLine).not.toBe(firstLine.toUpperCase());
    },
  );
});
