import type Redis from "ioredis";

import type { OAuthVerifier } from "./auth/oauth.js";
import type { RefreshTokenStore } from "./auth/refresh-store.js";
import type { AppConfig } from "./config/env.js";
import type { Database } from "./db/client.js";

/**
 * Laufzeit-Abhängigkeiten des Servers, gebündelt injiziert. So baut der
 * Entrypoint die echten Ressourcen (Postgres, Redis, …) und Tests reichen
 * Wegwerf-/Fake-Implementierungen herein – `buildServer` selbst hat keine
 * I/O-Seiteneffekte.
 */
export interface ServerDeps {
  readonly config: AppConfig;
  readonly db: Database;
  readonly redis: Redis;
  readonly oauth: OAuthVerifier;
  readonly refreshStore: RefreshTokenStore;
}
