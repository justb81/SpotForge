# data/facts

Seed- und Migrationsmaterial für die **Offline-Fakten-Datenbank** (SQLite + FTS5,
ca. 50.000 Einträge, GDD §5.2). Die App nutzt diese DB für den Fakten-Lookup
während des Forge-Vorgangs – ohne Internet.

## Inhalt (geplant)

- `schema.sql` — Tabellen + FTS5-Index.
- `seeds/` — Rohdaten pro Kategorie (CSV/JSON), versioniert.
- Build-Skript in `tools/` erzeugt daraus die ausgelieferte `.db`.

## Wichtig

Die gebaute `facts.db` / `*.sqlite` wird **nicht** eingecheckt (siehe
`.gitignore`) – sie wird aus den Seeds gebaut bzw. per OTA aktualisiert.
