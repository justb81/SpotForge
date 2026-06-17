import postgres from "postgres";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { upsertAccount } from "../auth/accounts.js";
import type { VerifiedIdentity } from "../auth/oauth.js";
import { createDatabase, type Database } from "./client.js";
import { runMigrations } from "./migrate.js";
import { accounts } from "./schema.js";
import { withTenant } from "./tenant.js";

// Integrationstest des **harten** #18-Akzeptanzkriteriums: zwei Apps sind
// physisch isoliert. Läuft nur, wenn TEST_DATABASE_URL (Admin/Superuser auf eine
// Wegwerf-DB) gesetzt ist – sonst übersprungen (Default-`pnpm test` ohne DB).

const adminUrl = process.env.TEST_DATABASE_URL;

/** Leitet die Nicht-Superuser-App-URL aus der Admin-URL ab (gleiche DB). */
function appUrlFrom(admin: string): string {
  const url = new URL(admin);
  url.username = "spotforge_app";
  url.password = "spotforge_app_test";
  return url.toString();
}

function identity(subject: string): VerifiedIdentity {
  return { provider: "google", subject, displayName: subject };
}

describe.skipIf(!adminUrl)("RLS Mandantentrennung", () => {
  let db: Database;
  let closeDb: () => Promise<void>;
  let admin: postgres.Sql;

  beforeAll(async () => {
    const appUrl = appUrlFrom(adminUrl!);
    await runMigrations(adminUrl!, appUrl);
    ({ db, close: closeDb } = createDatabase(appUrl));
    admin = postgres(adminUrl!, { max: 1 });
  });

  afterEach(async () => {
    // Aufräumen mit der Admin-Verbindung (umgeht RLS bewusst).
    await admin`delete from accounts`;
  });

  afterAll(async () => {
    await closeDb();
    await admin.end({ timeout: 5 });
  });

  it("zeigt je Mandant nur dessen Konten", async () => {
    await upsertAccount(db, "cars", identity("sub-cars"));
    await upsertAccount(db, "animals", identity("sub-animals"));

    const carsRows = await withTenant(db, "cars", (tx) => tx.select().from(accounts));
    expect(carsRows).toHaveLength(1);
    expect(carsRows[0]!.appId).toBe("cars");

    const animalRows = await withTenant(db, "animals", (tx) => tx.select().from(accounts));
    expect(animalRows).toHaveLength(1);
    expect(animalRows[0]!.appId).toBe("animals");
  });

  it("liefert ohne gesetzten Mandanten keine Zeilen (fail-closed)", async () => {
    await upsertAccount(db, "cars", identity("sub-cars"));

    // Direkte Query ohne withTenant/set_config → RLS-Policy matcht nichts.
    const rows = await db.select().from(accounts);
    expect(rows).toHaveLength(0);
  });

  it("legt dieselbe Anbieter-Identität je Mandant als eigenes Konto an", async () => {
    const a = await upsertAccount(db, "cars", identity("shared-sub"));
    const b = await upsertAccount(db, "animals", identity("shared-sub"));
    expect(a.id).not.toBe(b.id);

    // Erneuter Login im selben Mandanten liefert dasselbe Konto (kein Duplikat).
    const again = await upsertAccount(db, "cars", identity("shared-sub"));
    expect(again.id).toBe(a.id);
  });
});
