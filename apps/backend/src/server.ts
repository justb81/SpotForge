import { CATEGORY_IDS } from "@spotforge/game-core";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";

import { authPlugin } from "./auth/plugin.js";
import { registerAuthRoutes } from "./auth/routes.js";
import type { ServerDeps } from "./deps.js";

/** Header, über den jede Anfrage ihren Mandanten (= AppDefinition.id) trägt. */
export const APP_ID_HEADER = "x-app-id";

declare module "fastify" {
  interface FastifyRequest {
    /** Mandanten-Key der Anfrage (aus dem `x-app-id`-Header). */
    appId?: string;
  }
}

/** Routen, die ohne Mandanten-Header erreichbar sind (Infra/Health). */
const PUBLIC_ROUTES = new Set(["/health", "/ready"]);

/**
 * Baut die Fastify-Instanz aus den injizierten Abhängigkeiten auf. Bewusst ohne
 * eigene I/O-Seiteneffekte (verbindet/migriert nicht selbst), damit Tests und
 * Entrypoint dieselbe Instanz nutzen. Die Mandantentrennung (`appId`-Scope) ist
 * von der Middleware bis zu den Queries (RLS, `withTenant`) durchgezogen.
 */
export async function buildServer(deps: ServerDeps): Promise<FastifyInstance> {
  const app = Fastify({
    // In Tests still; sonst strukturiertes Logging.
    logger: deps.config.NODE_ENV !== "test",
    // Coolify/Traefik terminieren TLS davor; Proxy-Header vertrauen.
    trustProxy: true,
  });

  // Mandanten-Auflösung: appId aus Header lesen, sonst (außer bei Public-Routes)
  // ablehnen. So ist jede fachliche Anfrage von Beginn an appId-skopiert.
  app.addHook("onRequest", async (request, reply) => {
    if (PUBLIC_ROUTES.has(request.url)) return;

    const appId = request.headers[APP_ID_HEADER];
    if (typeof appId !== "string" || appId.length === 0) {
      await reply.code(400).send({ error: `Missing ${APP_ID_HEADER} header` });
      return;
    }
    request.appId = appId;
  });

  await app.register(authPlugin, { config: deps.config });
  registerAuthRoutes(app, deps);

  // Liveness: Prozess läuft.
  app.get("/health", async () => ({ status: "ok" }));

  // Readiness: bereit, Traffic zu nehmen – Backing-Services aktiv pingen.
  app.get("/ready", async (_request, reply) => {
    try {
      await deps.db.execute(sql`select 1`);
      await deps.redis.ping();
    } catch (err) {
      app.log.warn({ err }, "readiness check failed");
      return reply.code(503).send({ status: "unavailable" });
    }
    return { status: "ready", categories: CATEGORY_IDS.length };
  });

  return app;
}
