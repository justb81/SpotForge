// Karten-Attribute (GDD §4). Bewusst getrennt: die **Definition** (Schema) lebt
// je Kategorie in `data/categories/<id>.json`, die **Werte** trägt jede Karte.

/** Schlüssel eines Attributs; verknüpft Definition und Kartenwert (z.B. "power"). */
export type AttributeKey = string;

/**
 * Definition eines Karten-Attributs – das **Schema**, nicht der Wert. Source of
 * Truth sind die Kategorie-Dateien unter `data/categories/<id>.json`. Beschreibt
 * Name, Einheit und ob bzw. wie das Attribut im Trumpf-Duell verglichen wird.
 * Die konkreten Werte einer Karte stehen in {@link AttributeValues}.
 */
export interface AttributeDefinition {
  /** Stabiler Schlüssel; entspricht den Keys in {@link AttributeValues}. */
  key: AttributeKey;
  /** Anzeigename (z.B. "PS"). Sprachneutral wie im Kategorienschema. */
  label: string;
  /** Einheit (z.B. "km/h"); leerer String, wenn einheitenlos. */
  unit: string;
  /** Ob dieses Attribut im Trumpf-Duell wählbar ist (GDD §6). */
  trumpfable: boolean;
  /** Vergleichsrichtung: true = höher gewinnt, false = niedriger gewinnt. */
  higherIsBetter: boolean;
}

/**
 * Die Attributwerte **einer Karte**: Schlüssel → Zahlenwert. Die Schlüssel
 * entsprechen den `key`s der {@link AttributeDefinition}s ihrer Kategorie;
 * Reihenfolge, Label und Einheit kommen aus dem Kategorienschema, nicht hierher.
 *
 * Werte sind numerisch, weil Trumpf-Vergleiche eine Ordnung brauchen (GDD §6).
 */
export type AttributeValues = Record<AttributeKey, number>;

/**
 * Vergleicht zwei Attributwerte gemäß {@link AttributeDefinition.higherIsBetter}.
 * @returns > 0, wenn `a` den Stich gewinnt; < 0, wenn `b` gewinnt; 0 bei Gleichstand.
 */
export function compareAttribute(def: AttributeDefinition, a: number, b: number): number {
  // Differenz direkt in Vergleichsrichtung bilden (kein unäres Minus), damit ein
  // Gleichstand stets +0 ergibt und nicht -0.
  return def.higherIsBetter ? a - b : b - a;
}
