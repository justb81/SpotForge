# Repository-Struktur

SpotForge ist ein **TypeScript-Monorepo** (pnpm Workspaces + Turborepo). Diese
Datei erklärt, *warum* jedes Modul existiert und *welche Grenzen* es hat. Das
Spielkonzept dahinter steht im [GDD](../Game-Design.md).

## Leitprinzipien

1. **Eine Domäne, zwei Laufzeiten.** Die Trumpf-Spiellogik und das Kartenschema
   müssen sowohl im Client (Offline-Battle gegen KI, Anzeige) als auch im Server
   (Anti-Cheat-Validierung bei PvP) identisch laufen. Deshalb lebt diese Logik in
   `packages/game-core` und wird von beiden Seiten importiert – nie kopiert.
2. **Reine Domäne bleibt frameworkfrei.** `game-core` kennt weder React Native
   noch Fastify, weder Kamera noch Datenbank. Das macht es testbar und portabel.
3. **Daten sind Code-getrennt.** Kategorien, Faktendaten und ML-Modelle liegen in
   `data/` als versionierte Quelle bzw. als Bezugsanweisung – nicht im App-Bundle
   fest verdrahtet.
4. **Privacy-first.** Die KI-Inferenz (`ai-engine`) ist on-device gekapselt; das
   Backend sieht standardmäßig keine Fotos (siehe GDD §10.4).

## Module

### `apps/mobile` — Expo / React Native
Die Spieler-App. Verantwortlich für Spotting (Kamera), Kartenbibliothek, Battle-
und Tausch-UI, Profil/Progression, Onboarding. Importiert `game-core`,
`ai-engine`, `api-client`, `ui`. Enthält keine eigene Spielregel-Logik.

### `apps/backend` — Fastify + WebSockets
Auth (JWT/OAuth2), PvP-Matchmaking & autoritative Battle-Validierung,
Marktplatz/Tausch, Leaderboards, Karten-/Account-Persistenz, Sync der
Offline-Daten. Importiert `game-core` für die Regel-Validierung. PostgreSQL,
Redis, MeiliSearch, S3-kompatibler Storage.

### `packages/game-core` — Spiel- & Kartendomäne (rein, frameworkfrei)
Typen und Regeln: `Card`, `Category`, `Attribute`, `Rarity`, Seltenheits­
algorithmus, Trumpf-Battle-Engine, Karten-Upgrade-Logik. Single Source of Truth
für alles Spielmechanische. Keine I/O-, UI- oder Netzwerk-Abhängigkeiten.

### `packages/ai-engine` — On-Device-KI-Pipeline
Kapselt Bild-Klassifikation → Kategorie-Erkennung → Fakten-Lookup → Karten-
Generierung → Card-Art. Definiert Interfaces (`Classifier`, `FactLookup`,
`CardArtGenerator`) plus ONNX-/SQLite-Implementierungen. Liefert ein fertiges
`Card`-Objekt (aus `game-core`) zurück.

### `packages/api-client` — typisierter Backend-Client
Generierter/handgepflegter REST- und WebSocket-Client. Teilt Request-/Response-
Typen mit dem Backend, damit Client und Server nie auseinanderlaufen. Wird nur
von der App genutzt.

### `packages/ui` — Design-System & Kartenrendering
Wiederverwendbare RN-Komponenten, Design-Tokens, das visuelle Kartenlayout
(inkl. Seltenheits-Frames, Foil-Effekte). Trennt Optik von Spiellogik.

### `packages/config` — geteilte Dev-Konfiguration
Basis-`tsconfig`, ESLint-/Prettier-Konfiguration, die alle Pakete erweitern.

### `data/categories` — Kategorien- & Attributschema
Die zehn Kategorien aus GDD §4 als deklaratives Schema (Attribute, Einheiten,
welche Attribute trumpffähig sind). Quelle für `game-core` und `ai-engine`.

### `data/facts` — Offline-Fakten-DB (Seeds)
Seed-/Migrationsmaterial für die SQLite-Faktendatenbank (~50.000 Einträge,
FTS5). Die gebaute `.db` wird nicht eingecheckt.

### `data/models` — ML-Modell-Artefakte
Klassifikations- und Card-Art-Modelle. Nicht im Git (Größe) – README beschreibt
Bezug via CDN/OTA.

### `tools` — Build-, Codegen- & Seed-Skripte
Hilfsskripte: Faktendaten in SQLite seeden, API-Typen generieren, Modelle holen.

## Abhängigkeitsrichtung

```
apps/mobile ───▶ ui, api-client, ai-engine, game-core
apps/backend ──▶ game-core
ai-engine ─────▶ game-core, data/categories
api-client ────▶ game-core (geteilte DTO-Typen)
game-core ─────▶ (keine internen Abhängigkeiten)
```

`game-core` ist die Wurzel: Es darf von nichts im Repo abhängen, aber alles darf
von ihm abhängen. Zyklen sind nicht erlaubt.
