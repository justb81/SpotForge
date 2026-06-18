// Kanonische, app-übergreifende Darstellung der Seltenheits-Stufen (GDD §5.3).
// Bewusst NICHT aus der `AppDefinition`: die Stufe C/U/R/E/L soll über alle
// Varianten hinweg gleich lesbar sein (Farbe = Spielsemantik). Dieselbe Farbe
// speist Badge UND den prozedural gerenderten Kartenrahmen (CardFrame).

import { Rarity } from "@spotforge/game-core";

export interface RarityStyle {
  /** Akzentfarbe der Stufe – speist Badge und gerenderten Kartenrahmen (CardFrame). */
  color: string;
  /** Kurzes, sprachneutrales Default-Label (lokalisierbar via Prop). */
  label: string;
}

/**
 * Akzentfarbe + Default-Label je Seltenheits-Stufe. Die einzige Farbquelle der
 * Stufe: sowohl das Badge als auch der prozedural gerenderte Kartenrahmen
 * (`CardFrame`) leiten ihre Farbe hieraus ab.
 */
export const RARITY_STYLES: Readonly<Record<Rarity, RarityStyle>> = {
  [Rarity.Common]: { color: "#B8BEC9", label: "Common" },
  [Rarity.Uncommon]: { color: "#36D399", label: "Uncommon" },
  [Rarity.Rare]: { color: "#3B9DFF", label: "Rare" },
  [Rarity.Epic]: { color: "#B061FF", label: "Epic" },
  [Rarity.Legendary]: { color: "#FFD400", label: "Legendary" },
};

/** Liefert die {@link RarityStyle} einer Stufe. */
export function rarityStyle(rarity: Rarity): RarityStyle {
  return RARITY_STYLES[rarity];
}
