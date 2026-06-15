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
