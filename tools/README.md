# tools

Build-, Codegen- und Seed-Skripte für das Monorepo.

## Skripte

- **fetch-models** — lädt die **gebündelten** Modell-Artefakte gemäß
  `fetch-models/models.manifest.json` (Schema v2) nach `data/models` und
  verifiziert sie per SHA-256 (`pnpm fetch-models`). Idempotent; läuft in CI vor
  dem Bundle. `ota`-Modelle lädt der Lifecycle (`packages/ai-engine`) zur
  Laufzeit. ✅ implementiert.
- **export-model** — exportiert ein HuggingFace-Bildklassifikationsmodell nach
  ExecuTorch `.pte` (`torch.export → XNNPACK`, via `optimum-executorch`) plus
  Labels + Metadaten + fertigem Manifest-Eintrag. Python; läuft in CI
  (`.github/workflows/model-export.yml`) und hostet das `.pte` als GitHub-
  Release-Asset. Siehe `export-model/README.md`. ✅ implementiert (#9).

## Geplante Skripte

- **seed-facts** — baut `data/facts/seeds/*` in die SQLite-Fakten-DB.
- **gen-api-types** — generiert geteilte DTO-Typen für `api-client` ↔ `backend`.
- **validate-categories** — prüft `data/categories/*.json` gegen das Schema.
