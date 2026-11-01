import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  GalleryShell,
  useGallery,
  type GalleryLocale,
  type GallerySection,
  type LocalizedText,
} from "@solaria.network/web-lib/gallery";
import { useTranslation } from "react-i18next";
import {
  GroupAction,
  Surface,
  SurfaceGroup,
  ToolbarAction,
} from "@solaria.network/web-lib";
import {
  IconBuilding,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconFolder,
  IconKey,
  IconAlertTriangle,
  IconMail,
  IconMailCheck,
  IconSolarPanel,
  IconUserCheck,
  IconUserMinus,
  IconUserX,
  type TablerIcon,
} from "@tabler/icons-react";

interface Template {
  id: string;
  versions: Record<GalleryLocale, { subject: string; path: string }>;
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
  "operational-alert": IconAlertTriangle,
};

const messages = {
  loading: {
    "pt-BR": "Carregando…",
    "en-US": "Loading…",
    "es-ES": "Cargando…",
  },
  failed: {
    "pt-BR":
      "Não foi possível carregar os templates. Atualize a página para tentar novamente.",
    "en-US": "Could not load the templates. Reload the page to try again.",
    "es-ES":
      "No se pudieron cargar las plantillas. Actualiza la página para intentarlo de nuevo.",
  },
  section: {
    "pt-BR": "Templates de e-mail",
    "en-US": "Email templates",
    "es-ES": "Plantillas de correo",
  },
  frame: {
    "pt-BR": "Prévia do e-mail",
    "en-US": "Email preview",
    "es-ES": "Vista previa del correo",
  },
  options: {
    "pt-BR": "Opções da prévia",
    "en-US": "Preview options",
    "es-ES": "Opciones de la vista previa",
  },
  ratio: {
    "pt-BR": "Proporção da prévia",
    "en-US": "Preview ratio",
    "es-ES": "Proporción de la vista previa",
  },
} satisfies Record<string, Record<GalleryLocale, string>>;

function DeviceSelector({
  mobile,
  onChange,
}: {
  mobile: boolean;
  onChange: (mobile: boolean) => void;
}) {
  const { text } = useGallery();
  const [expanded, setExpanded] = useState(false);
  const [smallScreen, setSmallScreen] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setSmallScreen(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    function outside(event: PointerEvent) {
      if (container.current?.contains(event.target as Node)) return;
      setExpanded(false);
    }
    function iframeFocus() {
      if (document.activeElement instanceof HTMLIFrameElement) {
        setExpanded(false);
      }
    }
    document.addEventListener("pointerdown", outside);
    window.addEventListener("blur", iframeFocus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("blur", iframeFocus);
    };
  }, [expanded]);

  function choose(value: boolean) {
    onChange(value);
    setExpanded(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  function expand() {
    setExpanded(true);
    requestAnimationFrame(() =>
      container.current
        ?.querySelector<HTMLElement>('[aria-pressed="true"]')
        ?.focus(),
    );
  }

  return (
    <div
      ref={container}
      className="device-selector"
      data-expanded={expanded}
      data-compact={mobile || smallScreen}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        setExpanded(false);
        requestAnimationFrame(() => trigger.current?.focus());
      }}
    >
      <ToolbarAction
        ref={trigger}
        icon="more"
        label={text(messages.options)}
        aria-expanded={expanded}
        aria-controls="preview-device-options"
        className="device-trigger"
        onClick={expand}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown") return;
          event.preventDefault();
          expand();
        }}
      />
      <div id="preview-device-options" className="device-options">
        <SurfaceGroup
          direction="horizontal"
          divided={false}
          role="group"
          aria-label={text(messages.ratio)}
          className="shrink-0"
        >
          <GroupAction
            layout="icon"
            label="Desktop"
            glyph={
              <IconDeviceDesktop
                size={22}
                className="shrink-0"
                aria-hidden="true"
              />
            }
            active={!mobile}
            onClick={() => choose(false)}
          />
          <GroupAction
            layout="icon"
            label="Mobile"
            glyph={
              <IconDeviceMobile
                size={22}
                className="shrink-0"
                aria-hidden="true"
              />
            }
            active={mobile}
            onClick={() => choose(true)}
          />
        </SurfaceGroup>
      </div>
    </div>
  );
}

function usePreviewWidth(mobile: boolean) {
  const [width, setWidth] = useState(mobile ? 375 : 900);
  const current = useRef(width);

  useEffect(() => {
    const target = mobile ? 375 : 900;
    const from = current.current;
    if (from === target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setWidth(target);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - started) / 360);
      const eased =
        progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      current.current = from + (target - from) * eased;
      setWidth(current.current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [mobile]);

  return width;
}

function EmailPreview({
  selected,
  mobile,
  width,
  onDeviceChange,
}: {
  selected: Template | undefined;
  mobile: boolean;
  width: number;
  onDeviceChange: (mobile: boolean) => void;
}) {
  const { locale, text } = useGallery();
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
  }, [selected]);
  const scale = Math.min(1, size.width / width) || 1;
  return (
    <div className="gallery-preview-layout" style={{ maxWidth: width + 18 }}>
      <Surface
        className="gallery-preview min-h-0"
        contentClassName="gallery-preview-content"
      >
        <div className="preview-toolbar">
          <DeviceSelector mobile={mobile} onChange={onDeviceChange} />
        </div>
        <section
          ref={container}
          aria-label={text(messages.frame)}
          className="frame-area"
        >
          {selected && (
            <div
              className="preview-device"
              style={{ width: width * scale, height: size.height }}
            >
              <iframe
                src={`./emails/${encodeURIComponent(selected.id)}.${locale}.html`}
                title={`${selected.versions[locale].subject} (${locale})`}
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
    </div>
  );
}

function Viewer({
  templates,
  error,
  selected,
}: {
  templates: Template[];
  error: boolean;
  selected: Template | undefined;
}) {
  const { locale, text } = useGallery();
  const { i18n } = useTranslation();
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const previewWidth = usePreviewWidth(mobile);

  if (!selected) {
    return (
      <p
        role={error ? "alert" : "status"}
        className="p-4 text-operational-muted"
      >
        {text(error ? messages.failed : messages.loading)}
      </p>
    );
  }
  return (
    <div
      className="gallery-workspace"
      style={
        {
          "--gallery-preview-width": `${previewWidth + 18}px`,
        } as CSSProperties
      }
    >
      <EmailPreview
        selected={templates.length ? selected : undefined}
        mobile={mobile}
        width={previewWidth}
        onDeviceChange={setMobile}
      />
    </div>
  );
}

export default function Gallery() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState(false);
  const [hash, setHash] = useState(location.hash);
  const selected =
    templates.find(
      (template) =>
        template.id === new URLSearchParams(hash.slice(1)).get("template"),
    ) ?? templates[0];

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

  const sections: GallerySection[] = [
    {
      id: "templates",
      title: messages.section,
      items: templates.map((template) => {
        const Glyph = templateIcons[template.id] ?? IconMail;
        const label = Object.fromEntries(
          Object.entries(template.versions).map(([code, version]) => [
            code,
            version.subject,
          ]),
        ) as Record<GalleryLocale, string>;
        return {
          id: template.id,
          label: label satisfies LocalizedText,
          icon: <Glyph size={20} className="shrink-0" aria-hidden="true" />,
        };
      }),
    },
  ];

  return (
    <GalleryShell
      title={{
        "pt-BR": "Previews de e-mail",
        "en-US": "Email previews",
        "es-ES": "Vistas previas de correo",
      }}
      repository="api-email"
      version={import.meta.env.VITE_VERSION}
      commit={import.meta.env.VITE_COMMIT}
      sections={sections}
      selectedId={selected?.id ?? ""}
      onSelect={(id) => {
        location.hash = new URLSearchParams({ template: id }).toString();
      }}
    >
      <Viewer templates={templates} error={error} selected={selected} />
    </GalleryShell>
  );
}
