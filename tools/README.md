# tools

Build-, Codegen- und Seed-Skripte für das Monorepo.

## Skripte

- **fetch-models** — lädt ML-Modelle gemäß `fetch-models/models.manifest.json`
  nach `data/models` und verifiziert sie per SHA-256 (`pnpm fetch-models`).
  Idempotent; läuft in CI vor dem Bundle. ✅ implementiert (PoC #50).

## Geplante Skripte

- **seed-facts** — baut `data/facts/seeds/*` in die SQLite-Fakten-DB.
- **gen-api-types** — generiert geteilte DTO-Typen für `api-client` ↔ `backend`.
- **validate-categories** — prüft `data/categories/*.json` gegen das Schema.
