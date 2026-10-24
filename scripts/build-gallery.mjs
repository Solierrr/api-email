import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { theme } from "@solierrr/web-lib/tokens";
import { emailSchema, emailTemplates } from "../dist/email/email.schema.js";
import { renderEmail } from "../dist/email/email.service.js";

const root = new URL("../", import.meta.url);
const output = new URL("gallery-dist/", root);
const locales = ["pt-BR", "en-US", "es-ES"];
const manifest = [];

await mkdir(new URL("emails/", output), { recursive: true });
await cp(new URL("gallery/", root), output, { recursive: true });
await writeFile(new URL(".nojekyll", output), "");
await writeFile(
  new URL("theme.css", output),
  `:root{${Object.entries(theme)
    .map(([key, value]) => `${key}:${value}`)
    .join(";")}}`,
);

for (const template of emailTemplates) {
  const fixture = JSON.parse(
    await readFile(new URL(`preview/${template}.json`, root), "utf8"),
  );
  const versions = {};
  for (const locale of locales) {
    const data = { ...fixture.data, name: "Alex" };
    if (data.actionUrl) data.actionUrl = "https://example.invalid/demonstracao";
    delete data.modelImageUrl;
    const request = emailSchema.parse({
      ...fixture,
      template,
      locale,
      to: "example@example.com",
      data,
    });
    const rendered = await renderEmail(request);
    const html = rendered.html.replace(
      /<a\b([^>]*?)\s+href="[^"]*"([^>]*)>/gi,
      '<a$1$2 aria-disabled="true" tabindex="-1">',
    );
    if (/<a\b[^>]*\shref\s*=/i.test(html))
      throw new Error(`Active link in ${template}/${locale}`);
    const path = `emails/${template}.${locale}.html`;
    await writeFile(new URL(path, output), html);
    versions[locale] = { subject: rendered.subject, path };
  }
  manifest.push({ id: template, versions });
}

await writeFile(new URL("templates.json", output), JSON.stringify(manifest));
console.log(
  `Gallery: ${manifest.length} templates × ${locales.length} languages → ${fileURLToPath(output)}`,
);
