# data/categories

Deklaratives Schema der Spielkategorien aus [GDD §4](../../docs/Game-Design.md#4-kategorien--kartenattribute).
Source of Truth für `game-core` (Attribute, trumpffähige Werte) und `ai-engine`
(Klassifikations-Mapping). Jede Datei ist eine Instanz von `CategoryDefinition`
(`packages/game-core/src/category.ts`).

## Format

Jede Kategorie ist eine JSON-Datei `<id>.json` mit:

- `id` (muss dem Dateinamen entsprechen), `name`, `emoji`, optional `examples[]`
- `attributes[]` mit `key`, `label`, `unit` (leerer String = einheitenlos),
  `trumpfable` (bool), `higherIsBetter` (bool, Vergleichsrichtung im Duell)

**Attribut-Modell:** Jedes Attribut ist entweder **trumpffähig** (im Trumpf-Duell
wählbar, GDD §6) oder **informativ** (nur Anzeige/Sammelreiz). Anzahl und
Trumpf-Auswahl variieren je Kategorie – es gibt keine feste Quote; jedes
einigermaßen kompetitive Merkmal sollte trumpffähig sein. Mindestens ein Attribut
muss trumpffähig sein.

Seltenheit/Wertigkeit gehören **nicht** ins Kategorieschema: Die Seltenheit kommt
aus dem §5.3-Algorithmus (nur via Real-World-Spotting erreichbar, §9.3),
Attribut-Boosts aus Upgrades (§7.3). Kein Attribut ist direkt an die Rarity
gekoppelt.

## Validierung

`pnpm validate-categories` prüft **alle** Dateien gegen das Schema (Pflichtfelder,
Typen, eindeutige Attribut-Keys, `id` == Dateiname, ≥ 1 trumpffähiges Attribut)
und schlägt mit Exit-Code ≠ 0 fehl. Läuft auch in CI.

## Vorhandene Kategorien

- 🚗 **vehicles** (Fahrzeuge) – Referenz-Beispiel; CarForge-MVP.
- 🦁 **animals** (Tiere).

Weitere Kategorien (✈️ Luftfahrt, 🌿 Pflanzen, 🏗️ Baumaschinen,
🚢 Wasserfahrzeuge, 🚂 Schienenfahrzeuge, 🏛️ Bauwerke, 🍄 Pilze,
🌍 Gestein & Mineralien) folgen mit der jeweiligen Vertikalen.

## Attribut-Konventionen

### Tiere – `endangerment` (Schutzstatus)

Ordinale IUCN-Skala (`unit: "Stufe"`); höher = bedrohter und gewinnt den Trumpf:

| Stufe | IUCN | Bedeutung |
|---|---|---|
| 0 | LC | Nicht gefährdet |
| 1 | NT | Vorwarnliste |
| 2 | VU | Gefährdet |
| 3 | EN | Stark gefährdet |
| 4 | CR | Vom Aussterben bedroht |
| 5 | EX | Ausgestorben (z.B. Fossilien im Naturkundemuseum) |

Der Schutzstatus ist ein normales trumpffähiges Attribut und **nicht** direkt an
die Rarity gekoppelt; der Seltenheits-Algorithmus (eigenes Issue) darf ihn als
„Realwelt-Seltenheit"-Signal nutzen. „Ausgestorben" (Stufe 5) ist damit der
stärkste Trumpf-Wert – das Deck-seitige Gegengewicht (Anti-Stacking) ist eine
Battle-/Deck-Regel (eigenes Issue), kein Schema-Belang.
