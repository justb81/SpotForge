// Verbindet die rohen Attributwerte einer Karte (game-core: AttributeValues) mit
// dem Attribut-Schema ihrer Kategorie (AttributeDefinition) zu anzeigefertigen
// Stat-Reihen. Reine Logik (kein RN) – damit hier testbar, ohne Renderer.

import type { AttributeDefinition, AttributeValues } from "@spotforge/game-core";

export interface StatDisplay {
  /** Stabiler Attribut-Schlüssel (zum Matchen einer Trumpf-Auswahl). */
  key: string;
  /** Anzeigename aus dem Kategorienschema (z.B. "PS"). */
  label: string;
  /** Einheit aus dem Schema (z.B. "km/h"); leer, wenn einheitenlos. */
  unit: string;
  /** Roher Zahlenwert (für Vergleiche). */
  value: number;
  /** Anzeigefertiger Wert inkl. Einheit (z.B. "240 km/h"). */
  formatted: string;
  /** Ob das Attribut im Trumpf-Duell wählbar ist (GDD §6). */
  trumpfable: boolean;
}

/** Formatiert einen Wert mit optionaler Einheit (z.B. `240` + `"km/h"` → `"240 km/h"`). */
export function formatStatValue(value: number, unit: string): string {
  return unit ? `${value} ${unit}` : String(value);
}

/**
 * Erzeugt die anzeigefertigen Stat-Reihen einer Karte. Reihenfolge folgt dem
 * Kategorienschema (`defs`); Attribute ohne Wert auf der Karte werden
 * übersprungen, Werte ohne passende Definition ignoriert (Schema ist die
 * Quelle der Wahrheit für Label/Einheit/Reihenfolge).
 */
export function toStatDisplays(
  values: AttributeValues,
  defs: AttributeDefinition[],
): StatDisplay[] {
  const rows: StatDisplay[] = [];
  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined) continue;
    rows.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      value,
      formatted: formatStatValue(value, def.unit),
      trumpfable: def.trumpfable,
    });
  }
  return rows;
}
