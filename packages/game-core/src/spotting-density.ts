// Lokale Spotting-Dichte (ADR 0009) — reine Auswahl-Policy für ein adaptives
// Standort-Raster. Die räumlichen Zählungen sind I/O und gehören auf den Server;
// hier lebt nur die deterministische Entscheidung, welche Auflösungsstufe gilt
// und welche Dichte daraus folgt (App und Server rechnen identisch).

/**
 * Konfiguration der Dichte-Policy (pro Variante/Kategorie, siehe ADR 0009).
 */
export interface SpottingDensityConfig {
  /**
   * Verfeinerungs-Schwelle `N`: Liegen in der aktuellen (gröberen) Zelle **mehr
   * als** `N` ähnliche, bereits geforgte Karten, wird in die feinere Zelle
   * gedrillt. So bleibt das Raster bei dünner Datenlage grob und verfeinert sich
   * erst, wo genug Daten eine lokale Messung tragen.
   */
  refineThreshold: number;
  /**
   * Sättigungskonstante `k` der Dichtekurve `count / (count + k)`. Default =
   * `refineThreshold` (bei genau `N` Karten ist die Dichte dann 0,5). Kleineres
   * `k` ⇒ Dichte steigt schneller mit jeder weiteren Karte.
   */
  saturationK?: number;
}

/** Klemmt einen Zähler defensiv auf eine nicht-negative Ganzzahl. */
function asCount(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Reine, deterministische Dichte-Policy (ADR 0009).
 *
 * `similarCountsCoarseToFine` ist die Anzahl ähnlicher, bereits geforgter Karten
 * je Auflösungsstufe — **von grob (Index 0) nach fein** — jeweils für die Zelle,
 * die den Fundort enthält (z.B. 0/1/2 Nachkommastellen der gerundeten
 * Koordinaten). Der Server liefert diese Zähler; die Stufen sind ihm überlassen.
 *
 * Es wird in die feinere Zelle gedrillt, solange der Zähler der aktuellen Stufe
 * `> refineThreshold` ist und eine feinere Stufe existiert. Aus dem Zähler der
 * erreichten Stufe ergibt sich die lokale Spotting-Dichte `∈ [0,1)` via
 * `count / (count + k)` — geeignet als `appSpottingFrequency` für
 * {@link computeRarity}.
 */
export function spottingDensity(
  similarCountsCoarseToFine: readonly number[],
  config: SpottingDensityConfig,
): number {
  const threshold = Math.max(0, config.refineThreshold);
  const k = Math.max(0, config.saturationK ?? threshold);

  let count = 0;
  for (let level = 0; level < similarCountsCoarseToFine.length; level++) {
    count = asCount(similarCountsCoarseToFine[level]);
    const finerExists = level < similarCountsCoarseToFine.length - 1;
    if (!(count > threshold && finerExists)) break;
  }

  if (k === 0) return count > 0 ? 1 : 0;
  return count / (count + k);
}
