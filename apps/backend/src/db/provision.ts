import type postgres from "postgres";

// Provisionierung der **Nicht-Superuser**-App-Rolle (ADR 0012).
//
// Hintergrund: Postgres umgeht RLS für Superuser **vollständig** – selbst
// `FORCE ROW LEVEL SECURITY` greift dann nicht. Die Mandantentrennung gilt also
// nur, wenn das Backend mit einer normalen Rolle verbindet. Das offizielle
// Postgres-Image legt seinen `POSTGRES_USER` aber als Superuser an; den nutzen
// wir nur für Migrationen. Für den Request-Pfad existiert eine separate Rolle.
//
// Diese Rolle wird beim Boot (mit der Admin-Verbindung) idempotent angelegt und
// mit Rechten versehen – Single Source of Truth für Name/Passwort ist die
// `DATABASE_URL` der App.

/** Erlaubte Rollennamen – streng, damit der Name gefahrlos als Identifier taugt. */
const ROLE_NAME = /^[a-z_][a-z0-9_]*$/;

/** Postgres-String-Literal (einfache Anführungszeichen verdoppeln). */
function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Liest Rollenname + Passwort aus der App-`DATABASE_URL`. Wirft, wenn der Name
 * kein zulässiger Identifier ist (sonst SQL-Injection-Fläche).
 */
export function appRoleFromUrl(databaseUrl: string): {
  name: string;
  password: string;
} {
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  if (!ROLE_NAME.test(name)) {
    throw new Error(`Ungültiger App-Rollenname in DATABASE_URL: '${name}'`);
  }
  return { name, password };
}

/**
 * Legt die App-Rolle an (oder aktualisiert ihr Passwort) und grantet ihr die
 * nötigen Rechte auf alle aktuellen **und** künftigen Objekte im Schema `public`.
 * Idempotent – läuft bei jedem Boot mit der Admin-Verbindung.
 */
export async function provisionAppRole(sql: postgres.Sql, databaseUrl: string): Promise<void> {
  const { name, password } = appRoleFromUrl(databaseUrl);
  const role = `"${name}"`; // Name ist validiert → sicher zu zitieren.
  const pw = quoteLiteral(password);

  await sql.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${name}') THEN
        CREATE ROLE ${role} LOGIN PASSWORD ${pw} NOSUPERUSER NOCREATEDB NOCREATEROLE;
      ELSE
        ALTER ROLE ${role} WITH LOGIN PASSWORD ${pw};
      END IF;
    END $$;
  `);

  // Schema-Nutzung + DML auf bestehenden Objekten.
  await sql.unsafe(`GRANT USAGE ON SCHEMA public TO ${role};`);
  await sql.unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role};`,
  );
  await sql.unsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role};`);
  // Künftige, von der Migrations-/Admin-Rolle erzeugte Objekte automatisch mit-granten.
  await sql.unsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role};`,
  );
  await sql.unsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role};`,
  );
}
