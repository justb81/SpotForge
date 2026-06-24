// Gemeinsame Box-Normalisierung der MLKit-Detektoren (#89): Pixel-Kanten einer
// Detektor-Box → normalisierte (0..1), auf [0,1] geklemmte {@link DetectedRegion}.
// **Verwirft ungültige Boxen** (nicht-endliche Werte oder Fläche ≤ 0) – sonst
// zählte der Sanitisierungs-Report eine Redaktion, die der Skia-Prozessor mangels
// Fläche gar nicht ausführt (eine „Gesichter 1"-Behauptung ohne echten Blur).

import type { DetectedRegion, RedactionTargetKind } from "@spotforge/ai-engine";

/** Pixel-Kanten einer Detektor-Box im Quellbild-Koordinatenraum. */
export interface PixelEdges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Normalisiert eine Pixel-Box auf 0..1 (relativ zur Bildkante) und heftet die
 * Ziel-Art an. Liefert `null`, wenn die Bildmaße oder die Box ungültig sind
 * (nicht-endlich oder resultierende Fläche ≤ 0) – solche Boxen werden verworfen,
 * **nicht** als redigiert gezählt.
 */
export function normalizeRect(
  edges: PixelEdges,
  imageWidth: number,
  imageHeight: number,
  kind: RedactionTargetKind,
): DetectedRegion | null {
  if (
    !Number.isFinite(imageWidth) ||
    !Number.isFinite(imageHeight) ||
    imageWidth <= 0 ||
    imageHeight <= 0 ||
    !Number.isFinite(edges.left) ||
    !Number.isFinite(edges.top) ||
    !Number.isFinite(edges.right) ||
    !Number.isFinite(edges.bottom)
  ) {
    return null;
  }
  const x = clamp01(edges.left / imageWidth);
  const y = clamp01(edges.top / imageHeight);
  const width = clamp01(edges.right / imageWidth) - x;
  const height = clamp01(edges.bottom / imageHeight) - y;
  if (width <= 0 || height <= 0) return null;
  return { kind, x, y, width, height };
}
