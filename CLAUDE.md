# CLAUDE.md

Leitfaden für Claude/Agenten, die an **SpotForge** arbeiten. Diese Datei fasst
das Projekt, die Architektur-Entscheidungen, Konventionen und die
Rahmenbedingungen der Arbeitsumgebung zusammen. Bei Konflikten gilt das
[Game Design Document](./docs/Game-Design.md) für *Spielinhalt* und die
[ADRs](./docs/adr/) für *Architektur*.

---

## Was ist SpotForge?

Ein Mobile-Game nach dem Loop **Spot → Forge → Collect → Battle/Trade**: Objekte
der echten Welt fotografieren, eine **lokale KI** erkennt sie und „schmiedet"
eine Sammelkarte mit realen Fakten als Stats; Karten werden gesammelt, getauscht
und in **Trumpf-Duellen** (Top-Trumps) eingesetzt.

**Produktmodell (wichtig):** SpotForge ist **White-Label**. Jede Kategorie ist
eine **eigene App** (Auto-App, Tier-App, …), erzeugt aus *einer* gemeinsamen
Codebase und unterschieden **nur durch Konfiguration**. Ein **zentraler,
mandantenfähiger Server** bedient alle Apps.

> **Aktueller Fokus:** Wir starten **ausschließlich mit der Auto-App (CarForge)**,
> halten aber alles generisch. Niemals kategorie-spezifische Annahmen fest in den
> gemeinsamen Code kodieren.

---

## Goldene Regeln

1. **Neue App = neue Konfiguration, kein Code.** Eine App ist eine
   `AppDefinition` unter `variants/<name>/`. Wenn du Code in `app-shell`/`ui`/
   `ai-engine` änderst, um eine bestimmte Kategorie zu unterstützen, machst du es
   wahrscheinlich falsch – es gehört in die `AppDefinition`.
2. **`game-core` ist rein.** Keine I/O, kein React Native, kein Fastify, kein
   Zufall ohne injizierten Seed. Es ist die **einzige Wahrheit** der Spielregeln –
   genutzt von App (offline) **und** Backend (autoritative PvP-Validierung).
3. **`app-shell` ist generisch.** Keine fest kodierten Texte, Farben, Bundle-IDs
   oder Kategorien – alles kommt aus der `AppDefinition`.
4. **Mandantentrennung am Server.** Jede Anfrage trägt eine `appId`
   (= `AppDefinition.id`); alle Daten sind `appId`-skopiert. App-übergreifende
   Features sind bewusst „später zuschaltbar", nicht jetzt.
5. **Privacy-first.** KI-Inferenz on-device; Fotos verlassen das Gerät nur per
   Opt-in; Standort nur grob (PLZ/Region).

---

## Architektur & Verzeichnisse

TypeScript-Monorepo (pnpm Workspaces + Turborepo).

```
apps/
  mobile/      generischer Expo-Host – baut JEDE App via APP_VARIANT
  backend/     zentraler, mandantenfähiger Fastify-Server (appId-skopiert)
packages/
  app-config/  AppDefinition-Schema (Guardrails, Prompts, Theme, Texte, Assets) – HERZSTÜCK
  app-shell/   die komplette generische App (Screens/Flows), kategorie-neutral
  game-core/   reine Spiel- & Kartendomäne (Card, Rarity, Trumpf-Engine)
  ai-engine/   On-Device-Pipeline (generisch; nimmt Guardrails/Prompts)
  api-client/  typisierter Backend-Client
  ui/          themebares Design-System & Kartenrendering
  config/      geteilte tsconfig / eslint / prettier
variants/
  cars/        CarForge – erste & einzige App (nur app.definition.ts + assets/)
data/
  categories/  Kategorien-/Attributschema (Source of Truth; vehicles.json = Referenz)
  facts/       Seeds für die Offline-Fakten-DB (SQLite + FTS5; .db nicht im Git)
  models/      ML-Modell-Artefakte (per CDN/OTA; nicht im Git)
docs/          Game-Design.md, architecture.md, repo-structure.md, adr/
tools/         Build-/Codegen-/Seed-Skripte
```

Vertiefung: [`docs/repo-structure.md`](./docs/repo-structure.md) ·
[`docs/architecture.md`](./docs/architecture.md).

### Abhängigkeitsrichtung (keine Zyklen)
```
variants/<name> ─▶ app-config
apps/mobile ─────▶ app-shell, app-config  + variants/<APP_VARIANT> (Build-Zeit)
apps/backend ────▶ game-core
app-shell ───────▶ ui, api-client, ai-engine, game-core, app-config
ai-engine ───────▶ game-core, app-config, data/categories
ui ──────────────▶ game-core, app-config
api-client ──────▶ game-core
app-config ──────▶ game-core
game-core ───────▶ (nichts – Wurzel)
```
`variants/` sind **keine** Workspace-Pakete, sondern reine Config-Bündel, die
`apps/mobile` per `APP_VARIANT` auflöst.

---

## Tech-Stack

| Bereich        | Wahl                                                          |
|----------------|---------------------------------------------------------------|
| Sprache        | TypeScript (end-to-end)                                       |
| Mobile         | React Native + Expo (White-Label via `APP_VARIANT`)           |
| Backend        | Node.js + Fastify (multi-tenant), PostgreSQL, Redis, Socket.io|
| On-Device-KI   | ONNX Runtime Mobile (YOLOv11-nano / MobileNetV4 / LCM)        |
| Offline-Daten  | SQLite + FTS5                                                 |
| Monorepo       | pnpm Workspaces + Turborepo                                   |

---

## Eine neue App hinzufügen

1. `variants/<name>/app.definition.ts` mit `defineApp({ … })` aus
   `@spotforge/app-config` anlegen (Identität, Kategorie + Guardrails,
   KI-Prompts, Theme, Text-Overrides, Asset-Pfade).
2. Assets nach `variants/<name>/assets/`.
3. Build-Profil in `apps/mobile/eas.json` ergänzen (`"env": { "APP_VARIANT": "<name>" }`).
4. `APP_VARIANT=<name> pnpm dev` bzw. `eas build --profile <name>`.

Kein Eingriff in den App-Code. Kategorie-Schema ggf. unter `data/categories/`
ergänzen.

---

## Entscheidungen (ADRs)

- **[ADR 0001](./docs/adr/0001-monorepo-and-react-native.md):** Monorepo +
  React Native/Expo + TypeScript end-to-end.
- **[ADR 0002](./docs/adr/0002-multi-app-single-codebase.md):** White-Label –
  viele Apps aus einer Codebase via Build-Varianten; ein mandantenfähiger Server.

Neue, wesentliche Architektur-Entscheidungen als weiteres ADR in `docs/adr/`
festhalten (durchnummeriert).

---

## Backlog & Arbeitsweise

- Wesentliche GDD-Aspekte sind als **Issues #2–#26** erfasst; Übersicht +
  Abhängigkeitsgraph im **Tracking-Issue #27**.
- Abhängigkeiten stehen als **`Blocked by: #…`** in jedem Issue (der GitHub-MCP-
  Server bietet keine native „blocked by"-Relation).
- Phasen-Label: **`phase:mvp`** vs. `phase:later`; Bereichs-Label `area:*`.
- **Milestone „MVP - CarForge" (#1)** bündelt alle `phase:mvp`-Issues.
- **Wurzeln (sofort/parallel startbar):** #2 (game-core Domänentypen) und #18
  (Backend Setup/Multi-Tenancy).
- Status: **Gerüst** – Workspace-Konfiguration, READMEs, `AppDefinition`-Schema
  und ausgefüllte cars-Variante stehen; Feature-Implementierung folgt.

---

## Konventionen

- Jedes Modul hat eine `README.md` mit Zweck, Grenzen und Abhängigkeiten – beim
  Implementieren aktuell halten.
- Code soll dem umgebenden Stil entsprechen (Kommentar-Dichte, Naming, Idiome).
- Commit-/PR-Sprache: Code/Doku überwiegend Deutsch (Projektkontext); technische
  Bezeichner Englisch.
- Branch-Konvention dieses Projekts: Entwicklung auf dem zugewiesenen
  `claude/*`-Feature-Branch; nicht direkt auf `main` pushen.
- Build/Tasks (sobald implementiert): `pnpm dev | build | test | lint | typecheck`
  laufen über Turborepo. `APP_VARIANT` wählt die App (Default: `cars`).

---

## Rahmenbedingungen der Arbeitsumgebung

Diese Umgebung ist ephemer (frisch geklonter Repo-Container); Ergebnisse müssen
committet & gepusht werden.

- **GitHub-Schreibzugriff über die GitHub-MCP-Tools** (`mcp__github__*`). Issues
  anlegen/aktualisieren, PRs erstellen/aktualisieren, Milestone-Zuordnung laufen
  zuverlässig darüber.
- **`gh`-CLI ist installiert, aber sein Token (`GH_TOKEN`, fine-grained PAT) ist
  überwiegend read-only:** Lesen via `gh api` funktioniert, aber **Schreiben
  schlägt mit `403 Resource not accessible by personal access token` fehl** –
  u.a. Milestones anlegen und Issues bearbeiten (`updateIssue`). Daher:
  - **Milestones anlegen:** nicht automatisierbar – muss in der GitHub-UI
    geschehen; danach Zuordnung per `mcp__github__issue_write` (Feld `milestone`).
  - **Issue-/PR-Writes:** immer über `mcp__github__*`, nicht über `gh`.
  - `gh api` ist dennoch nützlich für **Lesen** (PR-State, Checks, Milestones,
    Branch-Vergleiche).
- **Repo-Scope der MCP-Tools:** aktuell auf `justb81/spotforge` beschränkt.
- **CI:** Derzeit keine Checks konfiguriert (`pnpm`-Skripte sind noch
  Platzhalter). Wenn du CI einrichtest, dokumentiere es hier.
- Git-Push: `git push -u origin <branch>`; nach dem Push einen PR (ready for
  review) eröffnen, falls noch keiner existiert.

---

## Spielmechanik-Kurzreferenz (Details im GDD)

- **Seltenheit:** `f(Realwelt-Seltenheit × App-Häufigkeit × Standort-Bonus)` →
  C/U/R/E/L (GDD §5.3).
- **Trumpf-Battle:** Attribut wählen, höherer Wert gewinnt den Stich;
  deterministisch über injizierten Seed (Client = Server).
- **Spezialfähigkeiten** ab Rare: Turbo, Schild, Wildcard, Fusion, Scout (§6.3).
- **Upgrades:** 3 Duplikate → Stufe 2 (+10%), Stufe 3 = Foil (+20%) (§7.3).
- **Monetarisierung:** F2P, nur Kosmetik/Komfort – **kein Pay-to-Win** (§9).
