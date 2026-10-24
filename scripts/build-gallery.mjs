import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emailSchema, emailTemplates } from "../dist/email/email.schema.js";
import { renderEmail } from "../dist/email/email.service.js";

const root = new URL("../", import.meta.url);
const output = new URL("gallery-dist/", root);
const locales = ["pt-BR", "en-US", "es-ES"];

const outputPath = resolve(fileURLToPath(output));
if (outputPath !== resolve(fileURLToPath(root), "gallery-dist")) {
  throw new Error("Unexpected gallery output directory");
}
await rm(outputPath, { recursive: true, force: true });
await mkdir(new URL("emails/", output), { recursive: true });
await writeFile(new URL(".nojekyll", output), "");

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
