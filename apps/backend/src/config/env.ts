import { z } from "zod";

// 12-Factor: die gesamte Laufzeit-Konfiguration kommt aus der Umgebung und wird
// beim Start **einmal** validiert. Fehlt/ist etwas ungültig, soll der Prozess
// sofort und mit klarer Meldung abbrechen (fail-fast) – nicht erst, wenn die
// erste Anfrage eine fehlende Variable trifft.

/** Komma-separierte Liste → getrimmtes String-Array (leere Einträge raus). */
const csv = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),

  // --- PostgreSQL (durabler, RLS-isolierter Mandantenspeicher; ADR 0012) ---
  //
  // Zwei Rollen, bewusst getrennt (RLS greift nur für Nicht-Superuser!):
  //  - DATABASE_URL: **Nicht-Superuser**-App-Rolle für alle Request-Queries –
  //    erst dadurch erzwingen die RLS-Policies die Mandantentrennung.
  //  - MIGRATION_DATABASE_URL: Admin/Superuser für Migrate-on-boot; legt zugleich
  //    die App-Rolle idempotent an und grantet ihr Rechte (siehe db/provision.ts).
  DATABASE_URL: z.string().url(),
  MIGRATION_DATABASE_URL: z.string().url(),

  // --- Redis (Refresh-Tokens, später Sessions/Leaderboards/Real-Time) ---
  REDIS_URL: z.string().url(),

  // --- Auth: eigene Access-Tokens (kurzlebig, signiert mit JWT_SECRET) ---
  JWT_SECRET: z.string().min(16, "JWT_SECRET muss ≥16 Zeichen haben"),
  // Lebensdauer des Access-Tokens (Format von @fastify/jwt, z.B. "15m", "1h").
  JWT_ACCESS_TTL: z.string().default("15m"),
  // Lebensdauer des Refresh-Tokens in Sekunden (Default 30 Tage).
  REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  // --- OAuth2: erlaubte Audiences (client_id) je Anbieter, komma-separiert ---
  // Das vom Client gelieferte ID-Token muss als `aud` eine dieser IDs tragen.
  GOOGLE_CLIENT_IDS: csv,
  APPLE_CLIENT_IDS: csv,
});

/** Validierte, app-weite Laufzeit-Konfiguration. */
export type AppConfig = z.infer<typeof EnvSchema>;

/**
 * Liest und validiert die Umgebung. Wirft bei ungültiger/fehlender
 * Konfiguration einen Fehler mit allen Problemen auf einmal.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Ungültige Backend-Konfiguration:\n${issues}`);
  }
  return result.data;
}
