// Seltenheit einer Karte (GDD §5.3). Werte bewusst kleingeschrieben, damit sie
// 1:1 zu den `RARITY_STYLES`-Schlüsseln (@spotforge/ui) passen und sauber zu JSON
// serialisieren.

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
 * `Seltenheit = f(Realwelt-Seltenheit × App-Häufigkeit)`.
 *
 * Der „Standort-Bonus" der ursprünglichen GDD-Formel ist **kein eigener
 * Faktor** mehr: er steckt in {@link RarityInput.appSpottingFrequency}, die als
 * **lokale Spotting-Dichte** definiert ist (siehe ADR 0009). Beide numerischen
 * Felder sind normalisiert auf [0,1] und werden vor der Berechnung geklemmt
 * (nicht-endliche Werte → 0).
 */
export interface RarityInput {
  /**
   * Realwelt-Seltenheit ∈ [0,1]: 0 = allgegenwärtig (z.B. VW Golf),
   * 1 = extrem selten (z.B. Bugatti Veyron). Stammt aus der Fakten-DB.
   */
  realWorldRarity: number;
  /**
   * Lokale In-App-Spotting-Dichte ∈ [0,1]: 0 = an diesem Ort noch nie ein
   * ähnliches Objekt geforgt, 1 = sehr dicht geforgt. Je dichter ähnliche
   * Karten (variantenspezifischer Ähnlichkeits-Schlüssel) im Standort-Raster
   * beieinander liegen, desto höher ⇒ desto **häufiger** ⇒ **senkt** die
   * Seltenheit. Die Herleitung aus Zähler + Raster ist server-seitig (ADR 0009);
   * `computeRarity` selbst bekommt den fertigen [0,1]-Wert.
   */
  appSpottingFrequency: number;
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
 * In-App-Knappheit `(1 − lokale Spotting-Dichte)` multipliziert. Rein &
 * deterministisch (kein I/O, keine Zufälligkeit).
 */
export function rarityPercentile(input: RarityInput): number {
  const realWorld = clamp01(input.realWorldRarity);
  const appFrequency = clamp01(input.appSpottingFrequency);

  return realWorld * (1 - appFrequency);
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
