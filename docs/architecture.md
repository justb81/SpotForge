# Architektur

Ergänzt das [GDD §10](../Game-Design.md#10-technische-architektur) um die
Umsetzung im Monorepo. SpotForge folgt einem **White-Label-Modell**: viele Apps
(eine pro Kategorie) aus einer Codebase, ein zentraler mandantenfähiger Server.
Modulgrenzen: [`repo-structure.md`](./repo-structure.md). Grundsatzentscheidungen:
[ADR 0001](./adr/0001-monorepo-and-react-native.md),
[ADR 0002](./adr/0002-multi-app-single-codebase.md).

## Von der Konfiguration zur App

```
variants/cars/app.definition.ts   (AppDefinition: Guardrails, Prompts, Theme, Texte, Assets)
        │  APP_VARIANT=cars
        ▼
apps/mobile/app.config.ts          (Expo-Identität: Name, Bundle-ID, Icon, Splash)
        │  mountet
        ▼
@spotforge/app-shell               (generische App, parametrisiert mit der AppDefinition)
        │  nutzt
        ▼
ai-engine · ui · api-client · game-core
```

Eine neue App: `variants/<name>/` + Build-Profil. Kein App-Code wird angefasst.

## Core Game Loop → Module

```
SPOT      Kamera (app-shell)
  │
FORGE     ai-engine: Klassifikation → Guardrails (aus AppDefinition) → Fakten
          → game-core: Card + Rarity → Card-Art (Prompt aus AppDefinition)
  │
COLLECT   game-core (Upgrades), app-shell (Bibliothek), backend (Sync, appId)
  │
BATTLE    game-core (Trumpf-Engine) · offline in der App, autoritativ im Backend
TRADE     backend (Marktplatz, Direkttausch, pro Mandant) + api-client
```

## Guardrails & Prompts (der Konfigurationshebel)

Die `ai-engine` ist kategorie-neutral. Pro App steuern die `AppDefinition`-Felder
das Verhalten:

- **`category.guardrails`** – akzeptierte Kategorien, Mindest-Konfidenz,
  Ablehn-Meldung. Die Auto-App lehnt z.B. eine Katze ab, ohne Code zu ändern.
- **`ai.cardArtPrompt` / `ai.factPrompt` / `ai.classificationHint`** – steuern
  Card-Art, Fakten-Extraktion und Klassifikation pro App.

## Zentraler Server: Mandantenfähigkeit

Ein Server bedient alle Apps. Jede Anfrage trägt die `appId`
(= `AppDefinition.id`). Konten, Karten, Battles, Tausch und Leaderboards sind
`appId`-skopiert – getrennte Ökosysteme. Der Server ist von Beginn an
multi-tenant gebaut, damit app-übergreifende Battles/Tausch (GDD-USP „Löwe vs.
Ferrari") **später** ohne Re-Design zugeschaltet werden können.

## Offline-First & Synchronisation

Spotting und Kartenerstellung funktionieren offline (GDD §10.4). PvP-Battles sind
autoritativ am Server: Die App schickt Züge, das Backend validiert sie mit
*derselben* `game-core`-Engine (Anti-Cheat). Erstellte Karten werden beim
nächsten Sync mandantenskopiert gespiegelt.

## Warum geteilte Spiellogik der kritische Pfad ist

Getrennte Regel-Implementierungen in App und Server würden divergieren →
Cheating oder fälschlich abgelehnte Züge. `game-core` ist deshalb rein, geteilt
und über das Monorepo versioniert (atomare Änderungen an Regeln + beiden Seiten).

## Offene Architektur-Entscheidungen

Als [ADRs](./adr/) festgehalten. Noch offen: Persistenz-/ORM-Wahl im Backend,
State-Management-Library, Card-Art-Modell, Echtzeit-Transport, sowie der
spätere Schalter für app-übergreifende Interaktion.
