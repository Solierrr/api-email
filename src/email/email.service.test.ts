import { expect, expectTypeOf, it } from "vitest";
import type {
  EmailActionProps,
  EmailLayoutProps,
} from "@solaria.network/web-lib/email";
import { renderEmail } from "./email.service.js";
import { designTokens } from "@solaria.network/web-lib/tokens";
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
  expect(result.text).toContain("Solaria, 550 W");
  expect(result.text).toContain("Aprovado");
  expect(result.html).toContain("Plus Jakarta Sans");
  const body = result.html.match(/<body\b[^>]*>/i)?.[0];
  expect(body).toBeTruthy();
  expect(body).toContain(
    `background-color:${rgb(designTokens.colors.surface)}`,
  );
  expect(result.html).toContain(
    `background-color:${designTokens.colors.white}`,
  );
});
it("preserves the installed package's typed public email contract", () => {
  expectTypeOf<EmailLayoutProps>().not.toBeAny();
  expectTypeOf<EmailActionProps>().toEqualTypeOf<{
    href: string;
    label: string;
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
      expect(result.subject).not.toMatch(/solaria/i);
      expect(result.html).toContain(`lang="${locale}"`);
      expect(result.html).toContain("Solaria");
      expect(result.html).toContain('alt="Solaria"');
      expect(result.html).toContain('width="96"');
      expect(result.html).toContain('height="96"');
      expect(result.html).toContain('src="data:image/gif;base64,');
      expect(result.html).toContain("text-align:center");
      if (template !== "user-deletion") {
        expect(result.html).toContain(
          "linear-gradient(177deg, #FF9B52 0%, #FF650A 100%)",
        );
        expect(result.html).toContain("border-radius:9999px");
        expect(result.html).toContain("display:inline-block");
        expect(result.html).not.toContain("Se o botão não funcionar");
      }
      expect(result.html).not.toContain(">Solaria</p>");
      if (template !== "user-deletion")
        expect(result.html.toLowerCase()).toContain("#ff650a");
      expect(result.html).not.toContain("var(--");
      expect(result.html).not.toContain("<script");
      if (template === "user-deletion") {
        expect(result.html).not.toContain(
          'href="https://solaria.example/action?token=test"',
        );
        const legalLabels = {
          "pt-BR": [
            "Não reconhece esta exclusão?",
            "solaria.innetwork@gmail.com",
          ],
          "en-US": [
            "Don&#x27;t recognize this deletion?",
            "solaria.innetwork@gmail.com",
          ],
          "es-ES": [
            "¿No reconoces esta eliminación?",
            "solaria.innetwork@gmail.com",
          ],
        }[locale];
        for (const label of legalLabels) expect(result.html).toContain(label);
        expect(result.html).toContain('src="data:image/png;base64,');
        const footerLabels = {
          "pt-BR": ["Política de privacidade", "GitHub Solaria"],
          "en-US": ["Privacy policy", "Solaria on GitHub"],
          "es-ES": ["Política de privacidad", "GitHub de Solaria"],
        }[locale];
        for (const label of footerLabels)
          expect(result.html).toContain(`title="${label}"`);
        expect(result.html).not.toContain("Política de cookies");
        expect(result.html).not.toContain("Cookie policy");
        expect(result.html).not.toContain("Termos de uso");
        expect(result.html).not.toContain("Terms of use");
        expect(result.html).not.toContain("Support email");
        expect(result.html).toContain("https://solarianetwork.site");
        expect(result.html).toContain("mailto:solaria.innetwork@gmail.com");
        expect(result.html).not.toContain("<hr");
      }
      if (template === "company-invitation")
        expect(result.text).toContain("Solaria & Partners");
    }
  },
);
