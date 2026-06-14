# Architektur

Ergänzt das [GDD §10](../Game-Design.md#10-technische-architektur) um die
konkrete Umsetzung im Monorepo. Modulgrenzen: siehe
[`repo-structure.md`](./repo-structure.md).

## Core Game Loop → Module

```
SPOT      Kamera (apps/mobile)
  │
FORGE     ai-engine: Klassifikation → Fakten → game-core: Card + Rarity
  │
COLLECT   game-core (Upgrades), apps/mobile (Bibliothek), apps/backend (Sync)
  │
BATTLE    game-core (Trumpf-Engine) · offline in der App, autoritativ im Backend
TRADE     apps/backend (Marktplatz, Direkttausch) + api-client
```

## Offline-First & Synchronisation

Spotting und Kartenerstellung funktionieren ohne Verbindung (GDD §10.4). Die App
hält den lokalen Spielzustand und synchronisiert opportunistisch:

- **Erstellte Karten** werden lokal erzeugt (on-device KI) und beim nächsten
  Sync ans Backend gespiegelt.
- **PvP-Battles** sind autoritativ auf dem Server – die App schickt Züge, das
  Backend validiert sie mit *derselben* `game-core`-Engine (Anti-Cheat).
- **Async-Modi** (Speed Spotting Battle) laufen über Backend-Persistenz.

## Warum geteilte Spiellogik der kritische Pfad ist

Würden Client und Server die Trumpf-Regeln getrennt implementieren, drohen
Divergenzen, die entweder Cheating ermöglichen oder gültige Züge fälschlich
ablehnen. `game-core` ist deshalb bewusst:

- **rein** (keine I/O, kein Framework) → deterministisch & testbar,
- **geteilt** (ein Package, zwei Importeure) → eine Wahrheit,
- **versioniert** über das Monorepo → atomare Änderungen an Regeln + beiden Seiten.

## On-Device-KI-Vertrag

`ai-engine` exponiert einen schmalen Vertrag, damit Modelle austauschbar bleiben:

```
forgeCard(photo) →
  classifier.classify(photo)        // YOLOv11-nano / MobileNetV4 (ONNX)
  → factLookup.find(objectId)       // SQLite + FTS5
  → game-core.buildCard(facts)      // Stats, Seltenheit, Spezialfähigkeit
  → cardArt.generate(card)          // LCM / SD (quantisiert, ONNX)
  ⇒ Card
```

Modelle und Faktendaten werden per OTA/CDN aktualisiert, ohne App-Release.

## Offene Architektur-Entscheidungen

Festgehalten als [ADRs](./adr/). Die Grundsatzentscheidung (Monorepo + RN) ist
in [ADR 0001](./adr/0001-monorepo-and-react-native.md) dokumentiert. Noch offen:
Persistenz-/ORM-Wahl im Backend, konkrete State-Management-Library, Card-Art-
Modell, Echtzeit-Transport (Socket.io vs. rohe WebSockets).
