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
  /** Roher Zahlenwert (für Vergleiche); bei fehlendem Wert `0` (siehe `present`). */
  value: number;
  /** Anzeigefertiger Wert inkl. Einheit (z.B. "240 km/h") bzw. der Platzhalter. */
  formatted: string;
  /** Ob das Attribut im Trumpf-Duell wählbar ist (GDD §6). */
  trumpfable: boolean;
  /** Ob die Karte für dieses Attribut einen tatsächlichen Wert trägt (sonst Platzhalter). */
  present: boolean;
}

/** Formatiert einen Wert mit optionaler Einheit (z.B. `240` + `"km/h"` → `"240 km/h"`). */
export function formatStatValue(value: number, unit: string): string {
  return unit ? `${value} ${unit}` : String(value);
}

/** Optionen für {@link toStatDisplays}. */
export interface ToStatDisplaysOptions {
  /**
   * Auch Attribute ohne Wert auf der Karte ausgeben (mit Platzhalter statt
   * Zahl) – z.B. damit ein frischer Draft bereits die vollständige Werte-Struktur
   * der Kategorie zeigt. Default: `false` (nur vorhandene Werte).
   */
  includeMissing?: boolean;
  /** Platzhalter für fehlende Werte, wenn `includeMissing`; Default: `"—"`. */
  missingPlaceholder?: string;
}

/**
 * Erzeugt die anzeigefertigen Stat-Reihen einer Karte. Reihenfolge folgt dem
 * Kategorienschema (`defs`); Werte ohne passende Definition werden ignoriert
 * (Schema ist die Quelle der Wahrheit für Label/Einheit/Reihenfolge). Attribute
 * ohne Wert werden übersprungen – oder, mit {@link ToStatDisplaysOptions.includeMissing},
 * als Platzhalter-Reihe (`present: false`) ausgegeben.
 */
export function toStatDisplays(
  values: AttributeValues,
  defs: AttributeDefinition[],
  options: ToStatDisplaysOptions = {},
): StatDisplay[] {
  const { includeMissing = false, missingPlaceholder = "—" } = options;
  const rows: StatDisplay[] = [];
  for (const def of defs) {
    const value = values[def.key];
    if (value === undefined) {
      if (!includeMissing) continue;
      rows.push({
        key: def.key,
        label: def.label,
        unit: def.unit,
        value: 0,
        formatted: missingPlaceholder,
        trumpfable: def.trumpfable,
        present: false,
      });
      continue;
    }
    rows.push({
      key: def.key,
      label: def.label,
      unit: def.unit,
      value,
      formatted: formatStatValue(value, def.unit),
      trumpfable: def.trumpfable,
      present: true,
    });
  }
  return rows;
}
