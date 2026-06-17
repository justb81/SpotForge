import {
  loginRequestSchema,
  refreshRequestSchema,
  type AuthResponse,
  type Account as AccountDto,
} from "@spotforge/api-contract";
import type { FastifyInstance } from "fastify";

import type { Account } from "../db/schema.js";
import { getAccountById, upsertAccount } from "./accounts.js";
import type { ServerDeps } from "../deps.js";
import { durationToSeconds } from "./tokens.js";

/** Interne Konto-Zeile → öffentliche DTO-Sicht. */
function toAccountDto(account: Account): AccountDto {
  return {
    id: account.id,
    appId: account.appId,
    displayName: account.displayName,
  };
}

/**
 * Auth-Routen: Login (OAuth-ID-Token → eigene Tokens), Refresh (Rotation),
 * Logout (Widerruf) und `/me`. Alle sind mandanten-skopiert über den
 * `x-app-id`-Header (vom Tenant-Hook gesetzt).
 */
export function registerAuthRoutes(app: FastifyInstance, deps: ServerDeps): void {
  const { db, oauth, refreshStore, config } = deps;
  const accessTtl = durationToSeconds(config.JWT_ACCESS_TTL);

  const issueTokens = async (account: Account): Promise<AuthResponse> => {
    const accessToken = app.jwt.sign({ sub: account.id, appId: account.appId });
    const refreshToken = await refreshStore.issue(account.id, account.appId);
    return {
      account: toAccountDto(account),
      tokens: { accessToken, refreshToken, expiresIn: accessTtl },
    };
  };

  // POST /auth/login — ID-Token verifizieren, Konto holen/anlegen, Tokens geben.
  app.post("/auth/login", async (request, reply) => {
    const appId = request.appId!;
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid login payload" });
    }

    let identity;
    try {
      identity = await oauth.verify(parsed.data.provider, parsed.data.idToken);
    } catch {
      return reply.code(401).send({ error: "Invalid ID token" });
    }

    const account = await upsertAccount(db, appId, identity);
    return reply.send(await issueTokens(account));
  });

  // POST /auth/refresh — Refresh-Token gegen ein neues Paar tauschen (Rotation).
  app.post("/auth/refresh", async (request, reply) => {
    const appId = request.appId!;
    const parsed = refreshRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid refresh payload" });
    }

    const entry = await refreshStore.resolve(parsed.data.refreshToken);
    // Token unbekannt/abgelaufen – oder an einen anderen Mandanten gebunden.
    if (!entry || entry.appId !== appId) {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    const account = await getAccountById(db, appId, entry.accountId);
    if (!account) {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }

    // Rotation: altes Token entwerten, neues Paar ausgeben.
    await refreshStore.revoke(parsed.data.refreshToken);
    return reply.send(await issueTokens(account));
  });

  // POST /auth/logout — Refresh-Token widerrufen (Access-Token läuft ab).
  app.post("/auth/logout", async (request, reply) => {
    const parsed = refreshRequestSchema.safeParse(request.body);
    if (parsed.success) {
      await refreshStore.revoke(parsed.data.refreshToken);
    }
    return reply.code(204).send();
  });

  // GET /me — geschützt: Konto des Token-Inhabers im aktuellen Mandanten.
  app.get("/me", { preHandler: app.authenticate }, async (request, reply) => {
    const account = await getAccountById(db, request.appId!, request.user.sub);
    if (!account) {
      return reply.code(404).send({ error: "Account not found" });
    }
    return reply.send(toAccountDto(account));
  });
}
