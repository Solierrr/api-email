import { expect, expectTypeOf, it } from "vitest";
import type {
  EmailActionProps,
  EmailLayoutProps,
} from "@solierrr/web-lib/email";
import { renderEmail } from "./email.service.js";
import { designTokens } from "@solierrr/web-lib/tokens";
const rgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(",")})`;
import { emailTemplates, type EmailLocale } from "./email.schema.js";
it("renders the solar model card with image and technical context", async () => {
  const result = await renderEmail({
    template: "solar-model-approved",
    locale: "pt-BR",
    to: "user@example.com",
    data: {
      modelName: "Mono 550 W",
      modelManufacturer: "Solaria",
      modelPowerWatts: 550,
      modelImageUrl: "https://example.com/panel.png",
      actionUrl: "https://solaria.example/model",
    },
  });
  expect(result.html).toContain('src="https://example.com/panel.png"');
  expect(result.html).toContain('alt="Mono 550 W"');
  expect(result.text).toContain("Solaria · 550 W");
  expect(result.text).toContain("Aprovado");
  expect(result.html).toContain("Plus Jakarta Sans");
  const body = result.html.match(/<body\b[^>]*>/i)?.[0];
  expect(body).toBeTruthy();
  expect(body).toContain(
    `background-color:${rgb(designTokens.colors.surface)}`,
  );
  expect(body).not.toMatch(/background(?:-color)?:\s*#fff(?:fff)?(?:;|\")/i);
  expect(result.html).not.toContain("background-color:#FFFFFF");
});
it("preserves the installed package's typed public email contract", () => {
  expectTypeOf<EmailLayoutProps>().not.toBeAny();
  expectTypeOf<EmailActionProps>().toEqualTypeOf<{
    href: string;
    label: string;
    fallback: string;
  }>();
});
it.each(["pt-BR", "en-US", "es-ES"] as EmailLocale[])(
  "renders every template in %s",
  async (locale) => {
    for (const template of emailTemplates) {
      const result = await renderEmail({
        template,
        locale,
        to: "user@example.com",
        data: {
          name: "David",
          companyName: "Solaria & Partners",
          projectName: "Instalação residencial",
          projectRole: "MEMBER",
          invitationExpiresAt: "2026-10-19T12:00:00Z",
          modelName: "Solar 550 W",
          reason: "Certificate is unreadable <script>test</script>",
          actionUrl: "https://solaria.example/action?token=test",
        },
      });
      expect(result.subject).toBeTruthy();
      expect(result.html).toContain(`lang="${locale}"`);
      expect(result.html).toContain("Solaria");
      expect(result.html).toContain('alt="Solaria"');
      expect(result.html).toContain('src="data:image/png;base64,');
      expect(result.html).toContain("text-align:center");
      expect(result.html).not.toContain(">Solaria</p>");
      if (template !== "user-deletion")
        expect(result.html.toLowerCase()).toContain(
          rgb(designTokens.colors.orange),
        );
      expect(result.html).not.toContain("var(--");
      expect(result.html).not.toContain("<script");
      if (template === "user-deletion") {
        expect(result.html).not.toMatch(/<a\s/i);
      } else
        expect(result.text).toContain(
          "https://solaria.example/action?token=test",
        );
      if (template === "company-invitation")
        expect(result.text).toContain("Solaria & Partners");
    }
  },
);
