import { readdir, readFile } from "node:fs/promises";

const localHosts = ["localhost", "127.0.0.1", "::1", "mailpit"];
if (
  process.env.APP_ENV !== "dev" ||
  !localHosts.includes(process.env.SMTP_HOST) ||
  process.env.SMTP_PORT !== "1025"
) {
  throw new Error("Use APP_ENV=dev e o Mailpit local na porta SMTP 1025.");
}
if (!process.env.SERVICE_KEY_API_CORE) {
  throw new Error("Configure SERVICE_KEY_API_CORE no .env.");
}

const baseUrl = `http://127.0.0.1:${process.env.PORT || "8083"}`;
const folder = new URL("../assets/mocks/emails/", import.meta.url);
const files = (await readdir(folder))
  .filter((file) => file.endsWith(".json"))
  .sort();
const payloads = await Promise.all(
  files.map(async (file) => ({
    file,
    body: JSON.stringify(
      JSON.parse(await readFile(new URL(file, folder), "utf8")),
    ),
  })),
);

async function request(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.SERVICE_KEY_API_CORE,
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
}

for (const { file, body } of payloads) {
  const response = await request("/emails/preview", body);
  if (!response.ok) {
    throw new Error(`${file}: payload rejeitado (HTTP ${response.status}).`);
  }
}

for (const { file, body } of payloads) {
  const response = await request("/emails", body);
  if (!response.ok) {
    throw new Error(`${file}: envio falhou (HTTP ${response.status}).`);
  }
  console.log(`${file}: enviado para a caixa local.`);
}
console.log("Abra http://localhost:8025 para visualizar os e-mails.");
