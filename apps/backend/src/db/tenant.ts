import { sql } from "drizzle-orm";

import type { Database } from "./client.js";

/**
 * Session-Variable, gegen die die RLS-Policies prüfen. Wird **pro Transaktion**
 * gesetzt (lokal), nie global – so kann kein Wert über eine zurückgegebene
 * Pool-Verbindung in die nächste Anfrage „lecken".
 */
const TENANT_SETTING = "app.current_tenant";

/** Transaktion innerhalb von `withTenant` (Drizzle-Transaktions-Handle). */
export type TenantTx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Führt `fn` in einer Transaktion aus, in der `app.current_tenant = appId`
 * gesetzt ist. Damit greifen die Row-Level-Security-Policies: jede Query sieht
 * **ausschließlich** Zeilen dieses Mandanten – Defense-in-Depth zusätzlich zum
 * `app_id`-Filter im Anwendungscode (ADR 0012).
 *
 * `set_config(..., is_local = true)` ist das parametrisierbare Pendant zu
 * `SET LOCAL` (das keine Bind-Parameter erlaubt) und gilt nur bis Transaktionsende.
 */
export function withTenant<T>(
  db: Database,
  appId: string,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config(${TENANT_SETTING}, ${appId}, true)`);
    return fn(tx);
  });
}
