import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GitHubIcon,
  GroupAction,
  Icon,
  MenuItem,
  MenuList,
  OrganicLogo,
  Surface,
  SurfaceGroup,
} from "@solaria.network/gallery-ui";
import {
  IconBuilding,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconFolder,
  IconKey,
  IconMail,
  IconMailCheck,
  IconSolarPanel,
  IconUserCheck,
  IconUserMinus,
  IconUserX,
  type TablerIcon,
} from "@tabler/icons-react";

const languages = [
  { code: "pt-BR", label: "Português" },
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
] as const;
type Locale = (typeof languages)[number]["code"];
interface Template {
  id: string;
  versions: Record<Locale, { subject: string; path: string }>;
}

const templateIcons: Record<string, TablerIcon> = {
  "email-verification": IconMailCheck,
  "password-reset": IconKey,
  "company-invitation": IconBuilding,
  "project-invitation": IconFolder,
  "user-deletion": IconUserMinus,
  "registration-approved": IconUserCheck,
  "registration-rejected": IconUserX,
  "solar-model-approved": IconSolarPanel,
  "company-email-verification": IconMail,
};
const actionClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-small text-operational-ink transition-colors hover:bg-operational-hover focus-visible:outline-2 focus-visible:outline-operational-ink motion-reduce:transition-none";
const repository = "https://github.com/Solierrr/api-email";

function LanguageSwitcher({
  value,
  onChange,
  disabled,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const root = container.current;
    root?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    function outside(event: PointerEvent) {
      if (!root?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label="Idioma"
        title="Idioma"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="gallery-languages"
        disabled={disabled}
        className="flex h-9 cursor-pointer items-center-safe gap-1 rounded-small px-2 transition-colors hover:bg-operational-hover focus-visible:outline-2 focus-visible:outline-operational-ink disabled:opacity-40"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="globe" size={20} />
        <Icon
          name="chevronDown"
          size={20}
          className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <MenuList
          id="gallery-languages"
          role="listbox"
          aria-label="Idioma"
          className="absolute right-0 z-50 mt-1 min-w-40"
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const options = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="option"]',
              ),
            );
            const current = options.indexOf(
              document.activeElement as HTMLElement,
            );
            options[
              (current + (event.key === "ArrowDown" ? 1 : options.length - 1)) %
                options.length
            ]?.focus();
          }}
        >
          {languages.map((language) => (
            <MenuItem
              key={language.code}
              role="option"
              selected={value === language.code}
              onSelect={() => {
                onChange(language.code);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              {language.label}
            </MenuItem>
          ))}
        </MenuList>
      )}
    </div>
  );
}

function EmailPreview({
  selected,
  locale,
  mobile,
  onDeviceChange,
}: {
  selected: Template | undefined;
  locale: Locale;
  mobile: boolean;
  onDeviceChange: (mobile: boolean) => void;
}) {
  const container = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const width = mobile ? 375 : 900;
  const scale = Math.min(1, size.width / width) || 1;
  return (
    <Surface
      className="gallery-preview min-h-0"
      contentClassName="gallery-preview-content"
      style={{ maxWidth: width + 18 }}
    >
      <div className="preview-toolbar">
        <SurfaceGroup
          direction="horizontal"
          divided={false}
          role="group"
          aria-label="Proporção da prévia"
          className="rounded-full! p-1!"
          contentClassName="rounded-full!"
        >
          <GroupAction
            layout="icon"
            label="Desktop"
            glyph={
              <IconDeviceDesktop
                size={20}
                className="shrink-0"
                aria-hidden="true"
              />
            }
            active={!mobile}
            onClick={() => onDeviceChange(false)}
            className="size-8!"
          />
          <GroupAction
            layout="icon"
            label="Mobile"
            glyph={
              <IconDeviceMobile
                size={20}
                className="shrink-0"
                aria-hidden="true"
              />
            }
            active={mobile}
            onClick={() => onDeviceChange(true)}
            className="size-8!"
          />
        </SurfaceGroup>
      </div>
      <section
        ref={container}
        aria-label="Prévia do e-mail"
        className="frame-area"
      >
        {selected && (
          <div
            className="preview-device"
            style={{ width: width * scale, height: size.height }}
          >
            <iframe
              src={`./emails/${encodeURIComponent(selected.id)}.${locale}.html`}
              title={`${selected.versions[locale].subject} — ${locale}`}
              sandbox=""
              referrerPolicy="no-referrer"
              style={{
                width,
                height: Math.ceil(size.height / scale),
                transform: `scale(${scale})`,
              }}
            />
          </div>
        )}
      </section>
    </Surface>
  );
}

export default function Gallery() {
  const { i18n } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState(false);
  const [hash, setHash] = useState(location.hash);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const params = new URLSearchParams(hash.slice(1));
  const locale =
    languages.find((language) => language.code === params.get("locale"))
      ?.code ?? "pt-BR";
  const selected =
    templates.find((template) => template.id === params.get("template")) ??
    templates[0];

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("./templates.json", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to load templates");
        const manifest: Template[] = await response.json();
        if (!manifest.length) throw new Error("No templates available");
        setTemplates(manifest);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const changed = () => setHash(location.hash);
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  function navigate(template: string, language: Locale) {
    location.hash = new URLSearchParams({
      template,
      locale: language,
    }).toString();
  }

  return (
    <div className="gallery-shell flex h-dvh min-h-0 flex-col bg-operational-shell">
      <header className="navbar-frame z-30 w-full justify-between gap-2 bg-operational-shell!">
        <a
          href="./"
          aria-label="Início"
          className="inline-flex shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-operational-ink"
        >
          <OrganicLogo width={2.5} rotateSymbol rotateShape />
        </a>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <a
            href={repository}
            aria-label="Repositório no GitHub"
            title="GitHub"
            target="_blank"
            rel="noopener noreferrer"
            className={actionClass}
          >
            <GitHubIcon size={20} />
          </a>
          <LanguageSwitcher
            value={locale}
            disabled={!selected}
            onChange={(language) => selected && navigate(selected.id, language)}
          />
        </div>
      </header>
      <main className="gallery-workspace">
        <nav aria-label="Templates de e-mail" className="min-h-0 min-w-0">
          <SurfaceGroup
            className="gallery-templates"
            contentClassName="gallery-template-list"
          >
            {templates.map((template) => {
              const Glyph = templateIcons[template.id] ?? IconMail;
              return (
                <GroupAction
                  key={template.id}
                  label={template.versions[locale].subject}
                  content={template.versions[locale].subject}
                  glyph={
                    <Glyph size={20} className="shrink-0" aria-hidden="true" />
                  }
                  active={selected?.id === template.id}
                  onClick={() => navigate(template.id, locale)}
                />
              );
            })}
            {!selected && (
              <p
                role={error ? "alert" : "status"}
                className="p-4 text-operational-muted"
              >
                {error
                  ? "Não foi possível carregar os templates. Atualize a página para tentar novamente."
                  : "Carregando…"}
              </p>
            )}
          </SurfaceGroup>
        </nav>
        <EmailPreview
          selected={selected}
          locale={locale}
          mobile={mobile}
          onDeviceChange={setMobile}
        />
      </main>
    </div>
  );
}
