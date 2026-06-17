import { Redis } from "ioredis";

import { OAuthVerifier } from "./auth/oauth.js";
import { RefreshTokenStore } from "./auth/refresh-store.js";
import { loadConfig } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { buildServer } from "./server.js";

// Entrypoint: Konfiguration validieren, Migrationen einspielen, Ressourcen
// verdrahten, Server starten – und bei SIGTERM/SIGINT alles sauber schließen
// (Container-Stop/Redeploy auf Coolify).

async function start(): Promise<void> {
  const config = loadConfig();

  // Migrate-on-boot vor allem anderen: erst wenn das Schema steht (und die
  // App-Rolle provisioniert ist), nehmen wir Verbindungen/Traffic an.
  // Fehlschlag = harter Abbruch (fail-fast).
  await runMigrations(config.MIGRATION_DATABASE_URL, config.DATABASE_URL);

  const { db, close: closeDb } = createDatabase(config.DATABASE_URL);
  const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const oauth = new OAuthVerifier({
    googleClientIds: config.GOOGLE_CLIENT_IDS,
    appleClientIds: config.APPLE_CLIENT_IDS,
  });
  const refreshStore = new RefreshTokenStore(redis, config.REFRESH_TTL_SECONDS);

  const app = await buildServer({ config, db, redis, oauth, refreshStore });

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, "shutting down");
    void (async () => {
      await app.close();
      await closeDb();
      redis.disconnect();
      process.exit(0);
    })();
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => shutdown(signal));
  }

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
