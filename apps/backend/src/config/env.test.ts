import { describe, expect, it } from "vitest";

import { loadConfig } from "./env";

const BASE = {
  DATABASE_URL: "postgresql://spotforge_app:pw@localhost:5432/spotforge",
  MIGRATION_DATABASE_URL: "postgresql://spotforge:pw@localhost:5432/spotforge",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "0123456789abcdef",
};

describe("loadConfig", () => {
  it("akzeptiert eine vollständige Umgebung und setzt Defaults", () => {
    const config = loadConfig({ ...BASE });
    expect(config.NODE_ENV).toBe("development");
    expect(config.PORT).toBe(3000);
    expect(config.JWT_ACCESS_TTL).toBe("15m");
    expect(config.GOOGLE_CLIENT_IDS).toEqual([]);
  });

  it("parst komma-separierte Client-IDs und coerced PORT", () => {
    const config = loadConfig({
      ...BASE,
      PORT: "8080",
      GOOGLE_CLIENT_IDS: "a.apps.googleusercontent.com, b.apps.googleusercontent.com",
    });
    expect(config.PORT).toBe(8080);
    expect(config.GOOGLE_CLIENT_IDS).toEqual([
      "a.apps.googleusercontent.com",
      "b.apps.googleusercontent.com",
    ]);
  });

  it("wirft bei fehlender DATABASE_URL", () => {
    const { DATABASE_URL: _omit, ...rest } = BASE;
    expect(() => loadConfig(rest)).toThrow(/DATABASE_URL/);
  });

  it("wirft bei zu kurzem JWT_SECRET", () => {
    expect(() => loadConfig({ ...BASE, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });
});
