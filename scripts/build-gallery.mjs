import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emailSchema, emailTemplates } from "../dist/email/email.schema.js";
import { renderEmail } from "../dist/email/email.service.js";
import { getEmailContent } from "../dist/email/templates/email.content.js";

const root = new URL("../", import.meta.url);
const output = new URL("gallery-dist/", root);
const locales = ["pt-BR", "en-US", "es-ES"];
// As imagens vêm de assets/mocks/images, copiadas do mocks-warehouse. O contrato só aceita URL https
// em modelImageUrl, então a galeria publica as cópias e aponta para elas. A chave é o ID do catálogo
// que o mock usa na URL do Cloudinary (ver assets/mocks/README.md).
const galleryBaseUrl = (
  process.env.GALLERY_BASE_URL || "https://solierrr.github.io/api-email"
).replace(/\/+$/, "");
const mockImages = {
  "solar-panels-f2b8091a5514": "R9XADX.webp",
  "enterprises-logos-54b4ae9664e9": "ZOBB69.webp",
};
const scrollbarCss = await readFile(
  new URL(import.meta.resolve("@solaria.network/gallery-ui/scrollbar.css")),
  "utf8",
);

const outputPath = resolve(fileURLToPath(output));
if (outputPath !== resolve(fileURLToPath(root), "gallery-dist")) {
  throw new Error("Unexpected gallery output directory");
}
await rm(outputPath, { recursive: true, force: true });
await mkdir(new URL("emails/", output), { recursive: true });
await cp(new URL("assets/mocks/images/", root), new URL("images/", output), {
  recursive: true,
});
await writeFile(new URL(".nojekyll", output), "");

const manifest = await Promise.all(
  emailTemplates.map(async (template) => {
    const fixture = JSON.parse(
      await readFile(
        new URL(`assets/mocks/emails/${template}.json`, root),
        "utf8",
      ),
    );
    const versions = Object.fromEntries(
      await Promise.all(
        locales.map(async (locale) => {
          const data = { ...fixture.data, name: "Alex" };
          if (data.actionUrl)
            data.actionUrl = "https://example.invalid/demonstracao";
          for (const field of ["modelImageUrl", "companyLogoUrl"]) {
            if (!data[field]) continue;
            const id = new URL(data[field]).pathname
              .split("/")
              .pop()
              ?.replace(/\.[a-z0-9]+$/i, "");
            const file = id ? mockImages[id] : undefined;
            if (file) data[field] = `${galleryBaseUrl}/images/${file}`;
            else delete data[field];
          }
          const request = emailSchema.parse({
            ...fixture,
            template,
            locale,
            to: "example@example.com",
            data,
          });
          const rendered = await renderEmail(request);
          const html = rendered.html
            .replace(
              "</head>",
              `<style data-preview-scrollbar>${scrollbarCss}</style></head>`,
            )
            .replace(/<a\b[^>]*>/gi, (tag) =>
              tag.replace(
                /\shref="[^"]*"/gi,
                ' aria-disabled="true" tabindex="-1"',
              ),
            );
          if (!html.includes("data-preview-scrollbar"))
            throw new Error(
              `Missing preview scrollbar in ${template}/${locale}`,
            );
          if (
            (html.match(/<a\b[^>]*>/gi) ?? []).some((tag) =>
              /\shref\s*=/i.test(tag),
            )
          )
            throw new Error(`Active link in ${template}/${locale}`);
          const path = `emails/${template}.${locale}.html`;
          await writeFile(new URL(path, output), html);
          // O menu e o título usam o nome fixo do modelo; o assunto de um aviso operacional muda a cada
          // alerta e é visto dentro do próprio e-mail.
          return [
            locale,
            { subject: getEmailContent(locale, template).subject, path },
          ];
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
