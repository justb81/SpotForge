import { generateKeyPair, SignJWT } from "jose";
import type { FastifyInstance } from "fastify";
import { beforeAll, afterAll, afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import type { Redis } from "ioredis";

import { OAuthVerifier } from "./auth/oauth.js";
import { RefreshTokenStore } from "./auth/refresh-store.js";
import { loadConfig } from "./config/env.js";
import { createDatabase, type Database } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { buildServer } from "./server.js";

// End-to-End am HTTP-Rand: belegt das #18-Akzeptanzkriterium („Anfragen ohne/mit
// falscher appId werden abgewiesen; Daten zweier Apps sind isoliert"). Braucht
// eine Wegwerf-DB (TEST_DATABASE_URL), sonst übersprungen.

const adminUrl = process.env.TEST_DATABASE_URL;
const ISSUER = "https://accounts.google.com";
const AUDIENCE = "client-123.apps.googleusercontent.com";

function appUrlFrom(admin: string): string {
  const url = new URL(admin);
  url.username = "spotforge_app";
  url.password = "spotforge_app_test";
  return url.toString();
}

/** Minimaler In-Memory-Redis (Subset, das Store + Readiness nutzen). */
class FakeRedis {
  private store = new Map<string, string>();
  set(key: string, value: string): Promise<"OK"> {
    this.store.set(key, value);
    return Promise.resolve("OK");
  }
  get(key: string): Promise<string | null> {
    return Promise.resolve(this.store.get(key) ?? null);
  }
  del(key: string): Promise<number> {
    return Promise.resolve(this.store.delete(key) ? 1 : 0);
  }
  ping(): Promise<"PONG"> {
    return Promise.resolve("PONG");
  }
}

describe.skipIf(!adminUrl)("HTTP: Mandanten-Header & Auth", () => {
  let app: FastifyInstance;
  let db: Database;
  let closeDb: () => Promise<void>;
  let admin: postgres.Sql;
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"];
  let publicKey: Awaited<ReturnType<typeof generateKeyPair>>["publicKey"];

  const googleToken = (sub: string): Promise<string> =>
    new SignJWT({ sub, name: sub })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setExpirationTime("5m")
      .sign(privateKey);

  beforeAll(async () => {
    const appUrl = appUrlFrom(adminUrl!);
    await runMigrations(adminUrl!, appUrl);
    ({ db, close: closeDb } = createDatabase(appUrl));
    admin = postgres(adminUrl!, { max: 1 });
    ({ privateKey, publicKey } = await generateKeyPair("RS256"));

    const config = loadConfig({
      NODE_ENV: "test",
      DATABASE_URL: appUrl,
      MIGRATION_DATABASE_URL: adminUrl!,
      REDIS_URL: "redis://localhost:6379",
      JWT_SECRET: "test-secret-0123456789",
      GOOGLE_CLIENT_IDS: AUDIENCE,
    });
    const oauth = new OAuthVerifier({
      googleClientIds: [AUDIENCE],
      appleClientIds: [],
      keyResolvers: { google: () => Promise.resolve(publicKey) },
    });
    const redis = new FakeRedis() as unknown as Redis;
    const refreshStore = new RefreshTokenStore(redis, 3600);
    app = await buildServer({ config, db, redis, oauth, refreshStore });
    await app.ready();
  });

  afterEach(async () => {
    await admin`delete from accounts`;
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
    await admin.end({ timeout: 5 });
  });

  it("erlaubt /health ohne Mandanten-Header", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("weist fachliche Anfragen ohne x-app-id ab (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { provider: "google", idToken: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("login → /me liefert das Konto im selben Mandanten", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-app-id": "cars" },
      payload: { provider: "google", idToken: await googleToken("sub-1") },
    });
    expect(login.statusCode).toBe(200);
    const { tokens, account } = login.json();
    expect(account.appId).toBe("cars");

    const me = await app.inject({
      method: "GET",
      url: "/me",
      headers: { "x-app-id": "cars", authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().id).toBe(account.id);
  });

  it("weist /me ohne Token ab (401)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: { "x-app-id": "cars" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("lehnt ein Token aus einem anderen Mandanten ab (403)", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-app-id": "cars" },
      payload: { provider: "google", idToken: await googleToken("sub-1") },
    });
    const { tokens } = login.json();

    // Gültiges Token, aber gegen einen anderen Mandanten verwendet.
    const res = await app.inject({
      method: "GET",
      url: "/me",
      headers: {
        "x-app-id": "animals",
        authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rotiert das Refresh-Token (altes wird ungültig)", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      headers: { "x-app-id": "cars" },
      payload: { provider: "google", idToken: await googleToken("sub-1") },
    });
    const { tokens } = login.json();

    const refreshed = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: { "x-app-id": "cars" },
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);

    const reuse = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: { "x-app-id": "cars" },
      payload: { refreshToken: tokens.refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
