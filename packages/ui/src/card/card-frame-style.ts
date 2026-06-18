// Reine Stufen→Geometrie-Ableitung für den prozedural gerenderten Kartenrahmen
// (#96, ersetzt den Frame-Anteil von ADR 0011). Keine RN-/Asset-Importe → in
// vitest testbar; die SVG-Darstellung (CardFrame) konsumiert nur diese Werte.
//
// `RARITY_STYLES` ist die **einzige** Farbquelle der Stufe; die visuelle
// Eskalation (Rahmenbreite, Glow-Ringe, Ornamente) leitet sich allein aus dem
// Stufen-Index (`RARITY_ORDER`) ab, sodass C/U/R/E/L auch ohne Farbe – über die
// Geometrie – unterscheidbar bleiben.

import { RARITY_ORDER, Rarity } from "@spotforge/game-core";
import { RARITY_STYLES } from "./rarity-style";

/** Festes Koordinatensystem des Rahmens (5:7), auflösungsunabhängig skaliert. */
export const CARD_FRAME_VIEWBOX = { width: 500, height: 700 } as const;

export interface CardFrameSpec {
  /** Stufe 0..4 (Index in {@link RARITY_ORDER}) – treibt die visuelle Eskalation. */
  tier: number;
  /** Akzentfarbe der Stufe (= {@link RARITY_STYLES}, einzige Rarity-Farbquelle). */
  color: string;
  /** Breite des Rahmenrings in viewBox-Einheiten (steigt mit der Stufe). */
  borderWidth: number;
  /** Anzahl äußerer Glow-Ringe (steigt mit der Stufe; 0 wäre glühlos). */
  glowLayers: number;
  /** Kantenlänge der Edelstein-Ornamente in viewBox-Einheiten. */
  gemRadius: number;
  /** Zusätzliche Eck-Ornamente ab Rare (Stufe ≥ 2). */
  cornerGems: boolean;
}

/**
 * Leitet die Rahmen-Geometrie einer Seltenheits-Stufe ab. Höhere Stufen erhalten
 * einen breiteren Ring, mehr Glow-Ringe, größere Edelsteine und (ab Rare)
 * Eck-Ornamente – so sind die Stufen auch monochrom klar unterscheidbar.
 */
export function cardFrameSpec(rarity: Rarity): CardFrameSpec {
  const tier = Math.max(0, RARITY_ORDER.indexOf(rarity));
  return {
    tier,
    color: RARITY_STYLES[rarity].color,
    borderWidth: 14 + tier * 3,
    glowLayers: 2 + tier,
    gemRadius: 10 + tier * 1.5,
    cornerGems: tier >= 2,
  };
}
