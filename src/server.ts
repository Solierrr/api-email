import { buildApp } from "./app.js";
import { readConfig } from "./config/config.js";

const config = readConfig();
const app = buildApp(config);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().catch(() => {
      process.exitCode = 1;
    });
  });
}
try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch {
  app.log.error("Server startup failed");
  await app.close();
  process.exitCode = 1;
}
