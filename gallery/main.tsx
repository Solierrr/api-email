import { createRoot } from "react-dom/client";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { uiTranslations } from "@solaria.network/web-lib";
import "@solaria.network/web-lib/style.css";
import "@solaria.network/web-lib/gallery.css";
import "./style.css";
import Gallery from "./Gallery";

const i18n = createInstance();
await i18n.use(initReactI18next).init({
  lng: "pt-BR",
  fallbackLng: "pt-BR",
  resources: uiTranslations,
  interpolation: { escapeValue: false },
});

createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <Gallery />
  </I18nextProvider>,
);
