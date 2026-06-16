// Auflösung der Seltenheits-Kartenrahmen. Reine Merge-Logik (kein Asset-Import) –
// damit testbar ohne RN-Bundler. Die konkreten generischen Default-Grafiken und
// der bequeme `resolveCardFrames` liegen in `generic-frames.ts` (Asset-Imports).
//
// Modell (siehe README): Die generischen Frames sind die verbindliche Baseline
// **aller** Apps; eine Variante überschreibt einzelne Stufen optional mit eigenen
// Grafiken. Der Merge findet zur Build-/Wiring-Zeit statt, sodass die App stets
// eine **vollständige** Frame-Map (alle Stufen gebunden) erhält.

import type { ImageSourcePropType } from "react-native";
import { RARITY_ORDER, Rarity } from "@spotforge/game-core";

/** Per-App-Overrides: pro Stufe optional eine eigene Frame-Grafik. */
export type CardFrameSources = Partial<Record<Rarity, ImageSourcePropType>>;

/** Vollständige Frame-Map: jede Stufe verbindlich gebunden. */
export type ResolvedCardFrames = Record<Rarity, ImageSourcePropType>;

/**
 * Legt die Varianten-Overrides über die generischen Defaults und liefert eine
 * **vollständige** Frame-Map (jede {@link Rarity} gebunden). Stufen ohne Override
 * behalten den generischen Default.
 */
export function mergeCardFrames(
  defaults: ResolvedCardFrames,
  overrides?: CardFrameSources,
): ResolvedCardFrames {
  const merged = { ...defaults };
  if (overrides) {
    for (const rarity of RARITY_ORDER) {
      const override = overrides[rarity];
      if (override !== undefined) {
        merged[rarity] = override;
      }
    }
  }
  return merged;
}
