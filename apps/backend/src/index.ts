import { buildServer } from "./server.js";

// Entrypoint: Server starten, Konfiguration aus der Umgebung (12-Factor),
// und sauberes Herunterfahren bei SIGTERM/SIGINT (Container-Stop/Redeploy).
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

const app = buildServer();

async function start(): Promise<void> {
  try {
    await app.listen({ port, host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    app.log.info({ signal }, "shutting down");
    void app.close().then(() => process.exit(0));
  });
}

void start();
