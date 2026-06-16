// Kanonische, app-übergreifende Darstellung der Seltenheits-Stufen (GDD §5.3).
// Bewusst NICHT aus der `AppDefinition`: die Stufe C/U/R/E/L soll über alle
// Varianten hinweg gleich lesbar sein (Farbe = Spielsemantik), während der
// konkrete Karten-Frame je App überschrieben werden kann (siehe CardView).

import { Rarity } from "@spotforge/game-core";

export interface RarityStyle {
  /** Akzentfarbe der Stufe – für den generischen Frame-Fallback und das Badge. */
  color: string;
  /** Kurzes, sprachneutrales Default-Label (lokalisierbar via Prop). */
  label: string;
}

/**
 * Akzentfarbe + Default-Label je Seltenheits-Stufe. Die Farben spiegeln die
 * Palette der generischen Kartenrahmen (`tools/gen-ui-frames.py`), damit Badge
 * und Frame derselben Stufe zusammenpassen.
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
