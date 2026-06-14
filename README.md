# SpotForge

> **Spot → Forge → Collect → Battle/Trade**
> Ein Mobile-Game, das Real-World-Spotting, KI-generierte Sammelkarten und
> Trumpf-Duelle (Top-Trumps-Mechanik) über *alle* Objektkategorien hinweg vereint.

Fotografiere ein Objekt aus der echten Welt – Auto, Tier, Flugzeug, Baumaschine,
Pflanze und mehr – eine **lokale KI-Engine** erkennt es, zieht reale Fakten und
*schmiedet* daraus eine einzigartige Sammelkarte. Karten werden gesammelt,
getauscht und in Trumpf-Duellen eingesetzt.

Das vollständige Spielkonzept steht im [Game Design Document](./Game-Design.md).

---

## Architektur auf einen Blick

SpotForge ist ein **TypeScript-Monorepo**. Die zentrale Spiel- und
Kartendomäne (`game-core`) ist framework­neutral und wird sowohl von der
**App** (Offline-Battles, Anzeige) als auch vom **Backend**
(Anti-Cheat-Validierung bei PvP) genutzt – kein duplizierter Code.

```
spotforge/
├── apps/
│   ├── mobile/        Expo / React-Native-App (Spotting, Karten, Battle, Tausch)
│   └── backend/       Fastify-API + WebSockets (Auth, PvP, Marktplatz, Sync)
├── packages/
│   ├── game-core/     Domäne: Card, Category, Rarity, Trumpf-Battle-Engine
│   ├── ai-engine/     On-Device-Pipeline: Klassifikation, Fakten, Card-Art
│   ├── api-client/    Typisierter Client für das Backend (von der App genutzt)
│   ├── ui/            Geteiltes Design-System & Kartenrendering
│   └── config/        Geteilte tsconfig / eslint / prettier
├── data/
│   ├── categories/    Kategorien- & Attributschema (Source of Truth)
│   ├── facts/         Seed-Daten für die Offline-Fakten-DB (SQLite)
│   └── models/        ML-Modell-Artefakte (per CDN bezogen, nicht im Git)
├── docs/              Architektur & Architecture Decision Records (ADR)
└── tools/             Build-/Codegen-/Seed-Skripte
```

Details: [`docs/repo-structure.md`](./docs/repo-structure.md) ·
[`docs/architecture.md`](./docs/architecture.md)

---

## Tech-Stack (Empfehlung aus dem GDD)

| Bereich            | Wahl                                                        |
|--------------------|-------------------------------------------------------------|
| Sprache            | TypeScript (end-to-end)                                     |
| Mobile             | React Native + Expo, Reanimated 3, Vision Camera v4         |
| Backend            | Node.js + Fastify, PostgreSQL, Redis, Socket.io             |
| On-Device-KI       | ONNX Runtime Mobile (YOLOv11-nano / MobileNetV4 / LCM)      |
| Offline-Daten      | SQLite + FTS5                                               |
| Monorepo-Tooling   | pnpm Workspaces + Turborepo                                 |

---

## Setup

> Status: **Gerüst** – die Module enthalten READMEs und Workspace-Konfiguration,
> die Implementierung folgt gemäß der [Roadmap](./Game-Design.md#13-roadmap-post-launch).

```bash
# Voraussetzungen: Node (siehe .nvmrc), pnpm
corepack enable
pnpm install

# Aufgaben über alle Workspaces (sobald implementiert)
pnpm dev          # App + Backend im Watch-Modus
pnpm build        # alle Pakete bauen
pnpm test         # Tests
pnpm lint         # Linting
```

---

## Mitwirken

Jedes Modul hat eine eigene `README.md` mit Zweck, Grenzen und Abhängigkeiten.
Architektur-Entscheidungen werden als [ADR](./docs/adr/) festgehalten.
