import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { theme } from "@solaria.network/web-lib/tokens";
import { emailSchema, emailTemplates } from "../dist/email/email.schema.js";
import { renderEmail } from "../dist/email/email.service.js";

const root = new URL("../", import.meta.url);
const output = new URL("gallery-dist/", root);
const locales = ["pt-BR", "en-US", "es-ES"];

await mkdir(new URL("emails/", output), { recursive: true });
await cp(new URL("gallery/", root), output, { recursive: true });
await writeFile(new URL(".nojekyll", output), "");
await writeFile(
  new URL("theme.css", output),
  `:root{${Object.entries(theme)
    .map(([key, value]) => `${key}:${value}`)
    .join(";")}}`,
);

const manifest = await Promise.all(
  emailTemplates.map(async (template) => {
    const fixture = JSON.parse(
      await readFile(new URL(`preview/${template}.json`, root), "utf8"),
    );
    const versions = Object.fromEntries(
      await Promise.all(
        locales.map(async (locale) => {
          const data = { ...fixture.data, name: "Alex" };
          if (data.actionUrl)
            data.actionUrl = "https://example.invalid/demonstracao";
          delete data.modelImageUrl;
          const request = emailSchema.parse({
            ...fixture,
            template,
            locale,
            to: "example@example.com",
            data,
          });
          const rendered = await renderEmail(request);
          const html = rendered.html.replace(/<a\b[^>]*>/gi, (tag) =>
            tag.replace(
              /\shref="[^"]*"/gi,
              ' aria-disabled="true" tabindex="-1"',
            ),
          );
          if (
            (html.match(/<a\b[^>]*>/gi) ?? []).some((tag) =>
              /\shref\s*=/i.test(tag),
            )
          )
            throw new Error(`Active link in ${template}/${locale}`);
          const path = `emails/${template}.${locale}.html`;
          await writeFile(new URL(path, output), html);
          return [locale, { subject: rendered.subject, path }];
        }),
      ),
    );
    return { id: template, versions };
  }),
);

await writeFile(new URL("templates.json", output), JSON.stringify(manifest));
console.log(
  `Gallery: ${manifest.length} templates × ${locales.length} languages → ${fileURLToPath(output)}`,
);
