import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// A versão do serviço aparece no rodapé; o commit vem do workflow (VITE_COMMIT)
const root = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
process.env.VITE_VERSION ||= root.version;

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
