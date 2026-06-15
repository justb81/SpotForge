# tools

Build-, Codegen- und Seed-Skripte für das Monorepo.

## Skripte

- **fetch-models** — lädt **alle** Modell-Artefakte gemäß
  `fetch-models/models.manifest.json` (Schema v3) nach `data/models` und
  verifiziert sie per SHA-256 (`pnpm fetch-models`). Idempotent; läuft in CI vor
  dem Bundle. Modelle werden fest ins APK gebündelt (kein Nachladen/OTA).
  ✅ implementiert.
- **export-model** — exportiert ein HuggingFace-Bildklassifikationsmodell nach
  ExecuTorch `.pte` (`torch.export → XNNPACK`, via `optimum-executorch`) plus
  Labels + Metadaten + fertigem Manifest-Eintrag. Python; läuft in CI
  (`.github/workflows/model-export.yml`) und hostet das `.pte` als GitHub-
  Release-Asset. Siehe `export-model/README.md`. ✅ implementiert (#9).
- **validate-categories** — prüft **alle** `data/categories/*.json` gegen das
  Schema (`CategoryDefinition`/`AttributeDefinition` aus `game-core`):
  Pflichtfelder, Typen, eindeutige Attribut-Keys, `id` == Dateiname und ≥ 1
  trumpffähiges Attribut. Exit-Code ≠ 0 bei Verstößen
  (`pnpm validate-categories`); CI-Gate. ✅ implementiert (#3).

## Geplante Skripte

- **seed-facts** — baut `data/facts/seeds/*` in die SQLite-Fakten-DB.
- **gen-api-types** — generiert geteilte DTO-Typen für `api-client` ↔ `backend`.
