import { randomBytes } from "node:crypto";

import type Redis from "ioredis";

// Refresh-Tokens leben in Redis (nicht in der DB): server-seitig widerrufbar,
// mit TTL versehen und bei jedem Refresh **rotiert**. Der Token selbst ist ein
// undurchsichtiges Zufalls-Secret; in Redis hängt daran nur, zu welchem Konto +
// Mandant er gehört.

/** Wert hinter einem Refresh-Token. */
interface RefreshEntry {
  accountId: string;
  appId: string;
}

const KEY_PREFIX = "refresh:";

function keyFor(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

export class RefreshTokenStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  /** Erzeugt ein neues Refresh-Token für (accountId, appId) und speichert es. */
  async issue(accountId: string, appId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const entry: RefreshEntry = { accountId, appId };
    await this.redis.set(keyFor(token), JSON.stringify(entry), "EX", this.ttlSeconds);
    return token;
  }

  /** Liest den Eintrag zu einem Token (oder null, wenn unbekannt/abgelaufen). */
  async resolve(token: string): Promise<RefreshEntry | null> {
    const raw = await this.redis.get(keyFor(token));
    return raw ? (JSON.parse(raw) as RefreshEntry) : null;
  }

  /** Widerruft (löscht) ein Refresh-Token – z.B. bei Rotation oder Logout. */
  async revoke(token: string): Promise<void> {
    await this.redis.del(keyFor(token));
  }
}
