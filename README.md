# SpotForge

> **Spot → Forge → Collect → Battle/Trade**
> Ein Mobile-Game, das Real-World-Spotting, KI-generierte Sammelkarten und
> Trumpf-Duelle (Top-Trumps-Mechanik) über *alle* Objektkategorien hinweg vereint.

Fotografiere ein Objekt aus der echten Welt – Auto, Tier, Flugzeug, Baumaschine,
Pflanze und mehr – eine **lokale KI-Engine** erkennt es, zieht reale Fakten und
*schmiedet* daraus eine einzigartige Sammelkarte. Karten werden gesammelt,
getauscht und in Trumpf-Duellen eingesetzt.

Das vollständige Spielkonzept steht im [Game Design Document](./docs/Game-Design.md).

---

## Architektur auf einen Blick

SpotForge ist ein **TypeScript-Monorepo** nach dem **White-Label-Prinzip**:
**Jede Kategorie ist eine eigene App** (Auto-App, Tier-App, …), die aus *einer*
gemeinsamen Codebase entsteht – unterschieden nur durch **Konfiguration**
(Kategorie-Guardrails, KI-Prompts, Styling, Text-Overrides, Grafiken). Ein
**zentraler, mandantenfähiger Server** bedient alle Apps.

> **Start:** Wir starten ausschließlich mit der **Auto-App (CarForge)**, halten
> aber alles generisch. Eine neue App = ein neuer Ordner unter `variants/` –
> **kein neuer Code**.

```
spotforge/
├── apps/
│   ├── mobile/        Generischer Expo-Host – baut JEDE App via APP_VARIANT
│   └── backend/       Zentraler, mandantenfähiger Fastify-Server (appId-skopiert)
├── packages/
│   ├── app-config/    AppDefinition-Schema (Guardrails, Prompts, Theme, Texte, Assets)
│   ├── app-shell/     Die komplette generische App (Screens, Flows), kategorie-neutral
│   ├── game-core/     Domäne: Card, Category, Rarity, Trumpf-Battle-Engine
│   ├── ai-engine/     On-Device-Pipeline (generisch, nimmt Guardrails/Prompts)
│   ├── api-client/    Typisierter Client für das Backend
│   ├── ui/            Themebares Design-System & Kartenrendering
│   └── config/        Geteilte tsconfig / eslint / prettier
├── variants/
│   └── cars/          CarForge – die erste App (nur Konfiguration + Assets)
├── data/
│   ├── categories/    Kategorien- & Attributschema (Source of Truth)
│   ├── facts/         Seed-Daten für die Offline-Fakten-DB (SQLite)
│   └── models/        ML-Modell-Artefakte (per CDN bezogen, nicht im Git)
├── docs/              Architektur & Architecture Decision Records (ADR)
└── tools/             Build-/Codegen-/Seed-Skripte
```

Die zentrale Spiel- und Kartendomäne (`game-core`) ist frameworkneutral und wird
sowohl von den Apps (Offline-Battles, Anzeige) als auch vom Backend
(Anti-Cheat-Validierung bei PvP) genutzt – kein duplizierter Code.

Details: [`docs/repo-structure.md`](./docs/repo-structure.md) ·
[`docs/architecture.md`](./docs/architecture.md)

---

## Tech-Stack (Empfehlung aus dem GDD)

| Bereich            | Wahl                                                        |
|--------------------|-------------------------------------------------------------|
| Sprache            | TypeScript (end-to-end)                                     |
| Mobile             | React Native + Expo (White-Label via `APP_VARIANT`)         |
| Backend            | Node.js + Fastify (multi-tenant), PostgreSQL, Redis, Socket.io |
| On-Device-KI       | ONNX Runtime Mobile (YOLOv11-nano / MobileNetV4 / LCM)      |
| Offline-Daten      | SQLite + FTS5                                               |
| Monorepo-Tooling   | pnpm Workspaces + Turborepo                                 |

---

## Setup

> Status: **Gerüst** – die Module enthalten READMEs und Workspace-Konfiguration,
> die Implementierung folgt gemäß der [Roadmap](./docs/Game-Design.md#13-roadmap-post-launch).

```bash
# Voraussetzungen: Node (siehe .nvmrc), pnpm
corepack enable
pnpm install

# Aufgaben über alle Workspaces (sobald implementiert)
# Die zu bauende App wählt APP_VARIANT (Default: cars)
APP_VARIANT=cars pnpm dev   # Auto-App + Backend im Watch-Modus
pnpm build        # alle Pakete bauen
pnpm test         # Tests
pnpm lint         # Linting
```

---

## Mitwirken

Jedes Modul hat eine eigene `README.md` mit Zweck, Grenzen und Abhängigkeiten.
Architektur-Entscheidungen werden als [ADR](./docs/adr/) festgehalten.
