import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Datenbank-Schema (Drizzle, Postgres-Dialekt; ADR 0012).
//
// **Mandantentrennung:** Jede fachliche Tabelle trägt `app_id` (= AppDefinition.id)
// und ist per Row-Level-Security (siehe RLS-Migration) physisch isoliert – eine
// App sieht **niemals** Zeilen einer anderen. Der Spaltenwert allein genügt nicht;
// erst die RLS-Policy + `app.current_tenant` (gesetzt pro Transaktion, siehe
// `withTenant`) erzwingt die Trennung DB-seitig.

/**
 * Konto eines Spielers – pro Mandant getrennt. Identität kommt aus einem
 * OAuth2-Anbieter (Google/Apple): `provider` + `provider_subject` (`sub`-Claim).
 * Dieselbe Anbieter-Identität in zwei Apps ergibt **zwei** Konten.
 */
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: text("app_id").notNull(),
    provider: text("provider").notNull(),
    providerSubject: text("provider_subject").notNull(),
    displayName: text("display_name"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Eine Anbieter-Identität ist je Mandant genau ein Konto.
    unique("accounts_tenant_identity").on(table.appId, table.provider, table.providerSubject),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
