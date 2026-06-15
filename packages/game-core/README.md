# @spotforge/game-core

Die **reine, frameworkfreie Spiel- und Kartendomäne**. Single Source of Truth für
alles Spielmechanische – importiert von App *und* Backend.

## Inhalt

- **Domänentypen:** `Card`, `Category`, `Attribute`, `Rarity`, `Ability`.
- **Seltenheits-Algorithmus:** `f(Realwelt-Seltenheit × lokale Spotting-Dichte)`
  → C/U/R/E/L (GDD §5.3, ADR 0009). Der Standort steckt in der Spotting-Dichte.
- **Trumpf-Battle-Engine:** Stich-Auflösung, Deck-Verwaltung, Spielmodi
  (Klassisch, Speed Spotting, Team) (GDD §6).
- **Spezialfähigkeiten:** Turbo, Schild, Wildcard, Fusion, Scout (GDD §6.3).
- **Upgrade-Logik:** Duplikate → Stufen → Foil (GDD §7.3).

## Regeln für dieses Paket

- **Keine I/O** (keine Datenbank, kein Netzwerk, kein Dateisystem).
- **Kein Framework** (kein React Native, kein Fastify).
- **Deterministisch** – jede Zufälligkeit wird über einen injizierten RNG-Seed
  reingereicht, damit Client und Server identisch rechnen.

## Warum

Würden App und Backend die Regeln getrennt implementieren, könnten sie
divergieren → Cheating oder fälschlich abgelehnte Züge. Hier leben sie einmal.

## Abhängigkeiten

Keine internen. Konsumiert das Kategorienschema aus `data/categories`.

## Status

Domänentypen (#2) stehen: `Card`, `CategoryDefinition` + `AttributeDefinition`,
`Rarity` (inkl. `rarityFromPercentile` für die GDD-§5.3-Bänder) und `Ability`
(Platzhalter). Der Seltenheits-Algorithmus (#4) ist umgesetzt: `computeRarity`
verdichtet `RarityInput` (Realwelt-Seltenheit × lokale Spotting-Dichte, plus
manuelle Kuratierung) über `rarityPercentile` zu einer Stufe – rein &
deterministisch. Die **lokale Spotting-Dichte** (Standort-Raster +
variantenspezifischer Ähnlichkeits-Schlüssel) wird server-seitig berechnet und
als fertiger [0,1]-Wert reingereicht (ADR 0009). Es folgen Trumpf-Engine und
Upgrade-Logik.
