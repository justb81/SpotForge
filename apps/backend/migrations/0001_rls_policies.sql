-- Row-Level-Security: erzwingt die Mandantentrennung DB-seitig (ADR 0012).
--
-- Jede fachliche Tabelle wird nur dann sichtbar/schreibbar, wenn `app_id` der
-- Session-Variable `app.current_tenant` entspricht (gesetzt pro Transaktion via
-- set_config in withTenant). FORCE gilt auch für den Tabellen-Eigentümer, mit
-- dem das Backend verbindet – sonst würde RLS für ihn übersprungen.
--
-- current_setting(..., true) liefert NULL statt Fehler, wenn die Variable nicht
-- gesetzt ist; der Vergleich ist dann NULL → keine Zeile passt (fail-closed).

ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "accounts_tenant_isolation" ON "accounts"
  USING ("app_id" = current_setting('app.current_tenant', true))
  WITH CHECK ("app_id" = current_setting('app.current_tenant', true));
