// Seltenheit einer Karte (GDD §5.3). Werte bewusst kleingeschrieben, damit sie
// 1:1 zu den `cardFrames`-Schlüsseln der AppDefinition (@spotforge/app-config)
// passen und sauber zu JSON serialisieren.

/** Seltenheits-Stufen, aufsteigend nach Seltenheit (GDD §5.3). */
export enum Rarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Epic = "epic",
  Legendary = "legendary",
}

/** Kanonische Reihenfolge der Stufen (häufig → selten). */
export const RARITY_ORDER: readonly Rarity[] = [
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
];

/** Rang einer Stufe (0 = Common … 4 = Legendary). */
export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

/**
 * Vergleicht zwei Stufen nach Seltenheit.
 * @returns < 0, wenn `a` häufiger ist; > 0, wenn `a` seltener ist; 0 bei Gleichheit.
 */
export function compareRarity(a: Rarity, b: Rarity): number {
  return rarityRank(a) - rarityRank(b);
}

/**
 * Untergrenzen (inklusiv) des Seltenheits-Perzentils je Stufe, aufsteigend.
 * `percentile` ∈ [0,1] ist das **Seltenheits-Perzentil**: 0 = häufigstes,
 * 1 = seltenstes Objekt. Die Bänder bilden die GDD-§5.3-Verteilung mit den
 * Breiten 60 / 20 / 15 / 4 / 1 % ab:
 *
 *   Common    [0.00, 0.60)
 *   Uncommon  [0.60, 0.80)
 *   Rare      [0.80, 0.95)
 *   Epic      [0.95, 0.99)
 *   Legendary [0.99, 1.00]
 *
 * Wie sich dieses Perzentil aus Realwelt-Seltenheit × App-Häufigkeit ×
 * Standort-Bonus ergibt, ist Sache des Seltenheits-Algorithmus (eigenes Issue).
 */
export const RARITY_PERCENTILE_BANDS: readonly { rarity: Rarity; minPercentile: number }[] = [
  { rarity: Rarity.Common, minPercentile: 0 },
  { rarity: Rarity.Uncommon, minPercentile: 0.6 },
  { rarity: Rarity.Rare, minPercentile: 0.8 },
  { rarity: Rarity.Epic, minPercentile: 0.95 },
  { rarity: Rarity.Legendary, minPercentile: 0.99 },
];

/**
 * Bildet ein Seltenheits-Perzentil (0 = häufigstes, 1 = seltenstes Objekt) auf
 * eine {@link Rarity} ab (GDD §5.3, {@link RARITY_PERCENTILE_BANDS}). Werte
 * außerhalb [0,1] werden geklemmt.
 */
export function rarityFromPercentile(percentile: number): Rarity {
  const p = Math.min(1, Math.max(0, percentile));
  let result: Rarity = Rarity.Common;
  for (const band of RARITY_PERCENTILE_BANDS) {
    if (p < band.minPercentile) break;
    result = band.rarity;
  }
  return result;
}

/** Klemmt auf [0,1]; nicht-endliche Werte (NaN/±∞) werden zu 0. */
function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/**
 * Eingaben des Seltenheits-Algorithmus (GDD §5.3):
 * `Seltenheit = f(Realwelt-Seltenheit × App-Häufigkeit × Standort-Bonus)`.
 *
 * Alle numerischen Felder sind normalisiert auf [0,1] und werden vor der
 * Berechnung geklemmt (nicht-endliche Werte → 0).
 */
export interface RarityInput {
  /**
   * Realwelt-Seltenheit ∈ [0,1]: 0 = allgegenwärtig (z.B. VW Golf),
   * 1 = extrem selten (z.B. Bugatti Veyron). Stammt aus der Fakten-DB.
   */
  realWorldRarity: number;
  /**
   * Globale In-App-Spotting-Häufigkeit ∈ [0,1]: 0 = praktisch nie gespottet,
   * 1 = sehr häufig gespottet. Häufiger = häufiger ⇒ **senkt** die Seltenheit.
   */
  appSpottingFrequency: number;
  /**
   * Standort-Bonus ∈ [0,1] (optional, Default 0): hebt die Seltenheit für
   * untypische Fundorte (z.B. ein Wüstentier in Deutschland). 0 = kein Bonus.
   */
  locationBonus?: number;
  /**
   * Manuelle Kuratierung: erzwingt eine feste Stufe und übergeht die
   * Berechnung (z.B. ein Prototyp-Rennwagen als {@link Rarity.Legendary}).
   */
  curatedRarity?: Rarity;
}

/**
 * Verdichtet die {@link RarityInput}-Faktoren zu einem Seltenheits-Perzentil
 * ∈ [0,1] (0 = häufigstes, 1 = seltenstes Objekt) gemäß GDD §5.3.
 *
 * Im Sinne der GDD-Formel multiplikativ: die Realwelt-Seltenheit wird mit der
 * In-App-Knappheit `(1 − App-Häufigkeit)` multipliziert; der Standort-Bonus
 * hebt das Ergebnis proportional zum verbleibenden Spielraum, bleibt also
 * innerhalb [0,1]. Rein & deterministisch (kein I/O, keine Zufälligkeit).
 */
export function rarityPercentile(input: RarityInput): number {
  const realWorld = clamp01(input.realWorldRarity);
  const appFrequency = clamp01(input.appSpottingFrequency);
  const locationBonus = clamp01(input.locationBonus ?? 0);

  const base = realWorld * (1 - appFrequency);
  return base + locationBonus * (1 - base);
}

/**
 * Reiner, deterministischer Seltenheits-Algorithmus (GDD §5.3): bildet die
 * {@link RarityInput}-Faktoren auf eine {@link Rarity} ab. Identisch in App
 * (offline) und Backend (autoritativ) nutzbar.
 *
 * Ist {@link RarityInput.curatedRarity} gesetzt, wird diese Stufe direkt
 * zurückgegeben (manuell kuratierte Legendaries u.ä.); andernfalls bestimmt
 * {@link rarityPercentile} → {@link rarityFromPercentile} die Stufe.
 */
export function computeRarity(input: RarityInput): Rarity {
  if (input.curatedRarity !== undefined) return input.curatedRarity;
  return rarityFromPercentile(rarityPercentile(input));
}
