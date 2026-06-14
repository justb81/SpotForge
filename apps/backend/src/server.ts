import { CATEGORY_IDS } from "@spotforge/game-core";
import Fastify, { type FastifyInstance } from "fastify";

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
 * Baut die Fastify-Instanz auf. Bewusst ohne I/O-Seiteneffekte, damit sie in
 * Tests und vom Entrypoint gleichermaßen verwendet werden kann. Die
 * Mandantentrennung (appId-Scope) ist hier als Gerüst angelegt – DB/Domänen-
 * logik folgt in den Backend-Issues und nutzt ausschließlich @spotforge/game-core.
 */
export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: true,
    // Coolify/Container terminieren TLS davor; Proxy-Header vertrauen.
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

  // Liveness: Prozess läuft.
  app.get("/health", async () => ({ status: "ok" }));

  // Readiness: bereit, Traffic zu nehmen. Später: DB/Redis-Pings ergänzen.
  app.get("/ready", async () => ({
    status: "ready",
    categories: CATEGORY_IDS.length,
  }));

  return app;
}
