import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Baut den Postgres-Pool + die Drizzle-Instanz. Bewusst als Fabrik (keine
 * Modul-Singletons), damit Tests eine eigene Verbindung gegen eine Wegwerf-DB
 * aufbauen und sauber schließen können.
 */
export function createDatabase(databaseUrl: string): {
  db: Database;
  sql: postgres.Sql;
  close: () => Promise<void>;
} {
  const sql = postgres(databaseUrl, {
    // Wir setzen den Mandanten pro Transaktion via set_config(..., local=true);
    // kein Prepared-Statement-Cache nötig, der das über Verbindungen verschleppt.
    prepare: false,
  });
  const db = drizzle(sql, { schema });
  return { db, sql, close: () => sql.end({ timeout: 5 }) };
}
