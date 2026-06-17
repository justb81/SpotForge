import { defineConfig } from "drizzle-kit";

// drizzle-kit: generiert versionierte SQL-Migrationen aus dem Schema
// (`pnpm --filter @spotforge/backend db:generate`). Die SQL-Dateien werden
// **committet** und zur Laufzeit per Migrate-on-boot eingespielt (ADR 0012,
// siehe src/db/migrate.ts) – drizzle-kit selbst läuft nicht im Container.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  // Nur für CLI-Operationen, die eine DB brauchen (push/studio); die
  // Boot-Migration nutzt DATABASE_URL aus der validierten Config.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/spotforge",
  },
});
