import { writeFile } from "node:fs/promises";
import { buildApp } from "../src/app.js";
import { readConfig } from "../src/config/config.js";
import { exportContract } from "../src/http/openapi.js";

// Placeholder values only: exporting the contract needs no secret, SMTP or network access
const config = readConfig({
  NODE_ENV: "test",
  APP_ENV: "dev",
  EMAIL_FROM: "noreply@solaria.local",
  EMAIL_ALLOWED_ORIGINS: "http://localhost:5173",
  SMTP_HOST: "localhost",
  DOCS_ENABLED: "true",
});
const app = await buildApp(
  config,
  {
    send: async () => "",
    verify: async () => undefined,
    close: () => undefined,
  },
  false,
);
await app.ready();
await writeFile(
  new URL("../openapi.yaml", import.meta.url),
  exportContract(app),
);
await app.close();
console.log("openapi.yaml written");
