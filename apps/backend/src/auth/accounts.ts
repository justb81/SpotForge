import { and, eq } from "drizzle-orm";

import type { Database } from "../db/client.js";
import { accounts, type Account } from "../db/schema.js";
import { withTenant } from "../db/tenant.js";
import type { VerifiedIdentity } from "./oauth.js";

/**
 * Holt das mandanten-gebundene Konto zur verifizierten Identität oder legt es
 * an (Login = Registrierung beim ersten Mal). Läuft in einer `withTenant`-
 * Transaktion, sodass RLS greift und der `app_id`-Wert garantiert dem Mandanten
 * der Anfrage entspricht.
 */
export function upsertAccount(
  db: Database,
  appId: string,
  identity: VerifiedIdentity,
): Promise<Account> {
  return withTenant(db, appId, async (tx) => {
    const existing = await tx
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, identity.provider),
          eq(accounts.providerSubject, identity.subject),
        ),
      )
      .limit(1);

    if (existing[0]) return existing[0];

    const inserted = await tx
      .insert(accounts)
      .values({
        appId,
        provider: identity.provider,
        providerSubject: identity.subject,
        email: identity.email ?? null,
        displayName: identity.displayName ?? null,
      })
      .returning();

    return inserted[0]!;
  });
}

/** Holt ein Konto per ID im Mandanten-Kontext (RLS-geschützt) oder null. */
export function getAccountById(
  db: Database,
  appId: string,
  accountId: string,
): Promise<Account | null> {
  return withTenant(db, appId, async (tx) => {
    const rows = await tx.select().from(accounts).where(eq(accounts.id, accountId)).limit(1);
    return rows[0] ?? null;
  });
}
