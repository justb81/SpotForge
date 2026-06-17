import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import type { AppConfig } from "../config/env.js";
import type { AccessTokenClaims } from "./tokens.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessTokenClaims;
    user: AccessTokenClaims;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    /**
     * preHandler-Guard für geschützte Routen: verifiziert das Access-Token und
     * stellt sicher, dass es **zum Mandanten der Anfrage** gehört (Token-`appId`
     * == `x-app-id`). So kann ein für App A ausgestelltes Token nicht gegen
     * App B verwendet werden.
     */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Registriert `@fastify/jwt` (eigene Access-Tokens) und den `authenticate`-Guard.
 */
export const authPlugin = fp(
  async (app: FastifyInstance, opts: { config: AppConfig }) => {
    await app.register(fastifyJwt, {
      secret: opts.config.JWT_SECRET,
      sign: { expiresIn: opts.config.JWT_ACCESS_TTL },
    });

    app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        await reply.code(401).send({ error: "Invalid or missing token" });
        return;
      }
      // Token darf nur im Mandanten gelten, für den es ausgestellt wurde.
      if (request.user.appId !== request.appId) {
        await reply.code(403).send({ error: "Token tenant mismatch" });
        return;
      }
    });
  },
  { name: "auth" },
);
