import { resolve } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { provisionAppRole } from "./provision.js";

// Migrate-on-boot (ADR 0012): das Runtime-Image enthält die generierten SQL-
// Migrationen (siehe Dockerfile-COPY) und spielt sie beim Start ein, bevor der
// Server Traffic nimmt. Läuft mit der **Admin/Superuser**-Verbindung
// (MIGRATION_DATABASE_URL) und provisioniert dabei die Nicht-Superuser-App-Rolle,
// mit der der Request-Pfad dann RLS-isoliert verbindet. Schlägt etwas fehl,
// bricht der Boot ab (fail-fast).
//
// Mehrere Instanzen (Coolify-Redeploy, Skalierung) können gleichzeitig starten.
// Damit nicht zwei Runner dieselbe Migration fahren, serialisiert ein Postgres-
// **Advisory-Lock** den Vorgang: der zweite Runner wartet, sieht danach den
// bereits gewanderten Zustand und macht nichts mehr.

/** Beliebige, projektweit eindeutige Lock-ID (nur für Migrationen). */
const MIGRATION_LOCK_KEY = 4_711_001;

/**
 * Ort der generierten Migrationen. Liegt im Paket-/Image-Wurzelverzeichnis
 * (`<cwd>/migrations`): im Dev ist das `apps/backend/`, im Container `/app/`
 * (Dockerfile kopiert `migrations/` dorthin). Per `MIGRATIONS_DIR` überschreibbar.
 */
export const MIGRATIONS_FOLDER = process.env.MIGRATIONS_DIR ?? resolve(process.cwd(), "migrations");

/**
 * Spielt ausstehende Migrationen ein und provisioniert die App-Rolle. Nutzt eine
 * dedizierte Single-Connection (`max: 1`), damit Advisory-Lock und Migrationen
 * garantiert dieselbe Session teilen, und schließt sie danach wieder.
 *
 * @param adminUrl  Admin/Superuser-Verbindung (MIGRATION_DATABASE_URL).
 * @param appUrl    App-Verbindung (DATABASE_URL) – liefert Name/Passwort der zu
 *                  provisionierenden Nicht-Superuser-Rolle.
 */
export async function runMigrations(adminUrl: string, appUrl: string): Promise<void> {
  const sql = postgres(adminUrl, {
    max: 1,
    // Der Drizzle-Migrator legt sein Bookkeeping per `CREATE SCHEMA/TABLE IF NOT
    // EXISTS` an; bei jedem Redeploy quittiert Postgres das mit harmlosen NOTICEs
    // ("already exists, skipping", 42P06 = duplicate_schema, 42P07 =
    // duplicate_table). Die filtern wir raus, sonst alle NOTICEs durchreichen –
    // damit unerwartete im Deploy-Log sichtbar bleiben.
    onnotice: (notice) => {
      if (notice.code === "42P06" || notice.code === "42P07") return;
      console.log(notice);
    },
  });
  try {
    await sql`select pg_advisory_lock(${MIGRATION_LOCK_KEY})`;
    try {
      const db = drizzle(sql);
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
      await provisionAppRole(sql, appUrl);
    } finally {
      await sql`select pg_advisory_unlock(${MIGRATION_LOCK_KEY})`;
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}
