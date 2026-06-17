# Repository-Struktur

SpotForge ist ein **TypeScript-Monorepo** (pnpm Workspaces + Turborepo) nach dem
**White-Label-Prinzip**: Jede Kartenkategorie ist eine eigene App, alle aus einer
gemeinsamen Codebase, unterschieden nur durch Konfiguration. Ein zentraler,
mandantenfähiger Server bedient alle Apps. Diese Datei erklärt, *warum* jedes
Modul existiert und *welche Grenzen* es hat. Spielkonzept: [GDD](./Game-Design.md).
Grundsatzentscheidung: [ADR 0002](./adr/0002-multi-app-single-codebase.md).

## Leitprinzipien

1. **Eine Codebase, viele Apps.** Der gesamte App-Code ist generisch und
   kategorie-neutral (`packages/app-shell`). Eine konkrete App entsteht aus einer
   `AppDefinition` (`variants/<name>/`) – **kein neuer Code pro App**.
2. **Konfiguration statt Code.** Alles per-App Variable steckt in der
   Konfiguration (`packages/app-config`): Kategorie-Guardrails, KI-Prompts und
   Text-Overrides in der `AppDefinition` (`app.definition.ts`); Styling/Grafiken
   als **Branding** (`branding.config.ts`, mit `variants/_default` als Basis,
   ADR 0011). Eine neue App = neuer `variants/`-Ordner + Build-Profil.
3. **Eine Domäne, zwei Laufzeiten.** Trumpf-Logik und Kartenschema laufen
   identisch in App (Offline) und Server (Anti-Cheat) → `packages/game-core`,
   nie kopiert.
4. **Reine Domäne bleibt frameworkfrei.** `game-core` kennt weder RN noch Fastify.
5. **Privacy-first.** KI-Inferenz (`ai-engine`) ist on-device gekapselt.
6. **Ein zentraler, mandantenfähiger Server.** Daten sind pro App (`appId`)
   getrennt; app-übergreifende Features bleiben später zuschaltbar.

## Module

### `apps/mobile` — generischer Expo-Host
Baut *jede* App. `app.config.ts` liest `APP_VARIANT`, lädt die passende
`AppDefinition` aus `variants/` und mountet `@spotforge/app-shell`. `eas.json`
hat pro App ein Build-Profil. Enthält selbst keine Feature-Logik.

### `apps/backend` — zentraler, mandantenfähiger Server (Fastify)
Auth, PvP + autoritative Battle-Validierung (`game-core`), Marktplatz,
Leaderboards, Persistenz, Sync – alles **pro `appId` getrennt**. PostgreSQL,
Redis, MeiliSearch, S3.

### `packages/app-config` — AppDefinition-Schema (Herzstück)
Typisiertes Schema + `defineApp`-Helper für alles per-App Konfigurierbare:
Identität, Kategorie + Guardrails, KI-Prompts, Theme, Text-Overrides, Assets.

### `packages/app-shell` — die generische App
Navigation, Screens und Flows (Spotting, Forge, Bibliothek, Battle, Tausch,
Profil, Onboarding), kategorie-neutral. Wird mit einer `AppDefinition`
parametrisiert und liefert die gemeinsamen Text-Defaults.

### `packages/game-core` — Spiel- & Kartendomäne (rein, frameworkfrei)
`Card`, `Category`, `Attribute`, `Rarity`, Seltenheitsalgorithmus,
Trumpf-Battle-Engine, Upgrade-Logik. Single Source of Truth für die Regeln.

### `packages/ai-engine` — On-Device-Spot-Pipeline (generisch)
Klassifikation (Zwei-Stufen-Kaskade) → Guardrail-Prüfung → **Draft-Karte**. Reale
Stats und Seltenheit kommen beim **Forgen** vom Server (Online-Schmiede, ADR 0010).
Guardrails und Prompts kommen aus der `AppDefinition`.

### `packages/api-contract` — geteilter API-Vertrag
Request-/Response-Schemata (zod) als **einzige Quelle** der Wire-Formate; Backend
validiert damit, der Client leitet seine Typen ab. Reines Paket (nur `zod`).

### `packages/api-client` — typisierter Backend-Client
REST + WebSocket, teilt DTO-Typen mit dem Backend (über `api-contract`, inkl.
`appId`-Kontext).

### `packages/ui` — themebares Design-System & Kartenrendering
Komponenten konsumieren Theme-Tokens und Asset-Pfade aus der `AppDefinition`.

### `packages/config` — geteilte Dev-Konfiguration
Basis-`tsconfig`, ESLint/Prettier.

### `variants/<name>` — eine App (nur Konfiguration)
`app.definition.ts` (funktional) + `branding.config.ts` (Theme/Assets, nur
Abweichungen) + `assets/`. `variants/_default` liefert die generische Branding-
Basis (Theme + Kartenrahmen) und ist keine eigene App (ADR 0011). Aktuell: `cars`
(CarForge). Kein Code.

### `data/categories` · `data/facts` · `data/models`
Kategorien-/Attributschema, Offline-Fakten-DB-Seeds, ML-Modell-Artefakte.

### `tools`
Build-, Codegen- und Seed-Skripte.

## Abhängigkeitsrichtung

```
variants/<name> ──▶ app-config (AppDefinition-Typen)
apps/mobile ──────▶ app-shell, app-config  +  variants/<APP_VARIANT> (zur Build-Zeit)
apps/backend ─────▶ game-core, api-contract
app-shell ────────▶ ui, api-client, ai-engine, game-core, app-config
ai-engine ────────▶ game-core, app-config, data/categories
ui ───────────────▶ game-core, app-config
api-client ───────▶ game-core, api-contract
api-contract ─────▶ (keine internen Abhängigkeiten – nur zod)
app-config ───────▶ game-core
game-core ────────▶ (keine internen Abhängigkeiten)
```

`game-core` ist die Wurzel (hängt von nichts ab), `app-config` definiert den
Konfigurations-Vertrag, `app-shell` ist die generische App. Zyklen sind nicht
erlaubt. `variants/` sind bewusst **keine** Workspace-Pakete, sondern reine
Config-Bündel, die `apps/mobile` per `APP_VARIANT` auflöst.
