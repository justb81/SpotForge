# data/categories

Deklaratives Schema der zehn Spielkategorien aus [GDD §4](../../docs/Game-Design.md#4-kategorien--kartenattribute).
Source of Truth für `game-core` (Attribute, trumpffähige Werte) und `ai-engine`
(Klassifikations-Mapping).

## Format

Jede Kategorie ist eine JSON-Datei mit:

- `id`, `name`, `emoji`
- `attributes[]` mit `key`, `label`, `unit`, `trumpfable` (bool),
  `higherIsBetter` (bool für Trumpf-Vergleich)

Pro Karte gelten laut GDD §4.2: 6 Kern-Attribute (3 trumpffähig, 3 informativ)
plus Spezialattribute. `vehicles.json` dient als Referenz-Beispiel.

## Kategorien

🚗 Fahrzeuge · ✈️ Luftfahrt · 🦁 Tiere · 🌿 Pflanzen · 🏗️ Baumaschinen ·
🚢 Wasserfahrzeuge · 🚂 Schienenfahrzeuge · 🏛️ Bauwerke · 🍄 Pilze ·
🌍 Gestein & Mineralien
