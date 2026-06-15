// Die zehn SpotForge-Kategorien (GDD §4). Source of Truth für die
// Attributschemata: data/categories.

import type { AttributeDefinition } from "./attribute";

export const CATEGORY_IDS = [
  "vehicles", // 🚗 Fahrzeuge
  "aviation", // ✈️ Luftfahrt
  "animals", // 🦁 Tiere
  "plants", // 🌿 Pflanzen
  "construction", // 🏗️ Baumaschinen
  "watercraft", // 🚢 Wasserfahrzeuge
  "rail", // 🚂 Schienenfahrzeuge
  "structures", // 🏛️ Bauwerke
  "fungi", // 🍄 Pilze
  "minerals", // 🌍 Gestein & Mineralien
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/**
 * Schema einer Kategorie: verknüpft eine {@link CategoryId} mit ihren
 * {@link AttributeDefinition}s. Die Dateien unter `data/categories/<id>.json`
 * sind Instanzen dieses Typs (Source of Truth); game-core selbst lädt nichts
 * (keine I/O) – das Laden/Validieren übernehmen Tools bzw. die ai-engine.
 */
export interface CategoryDefinition {
  id: CategoryId;
  /** Anzeigename (z.B. "Fahrzeuge"). Sprachneutral wie im Schema. */
  name: string;
  /** Emoji-Kennung der Kategorie. */
  emoji: string;
  /** Beispiel-Objekte (optional, für Onboarding/Anzeige). */
  examples?: string[];
  /** Attribut-Schema der Kategorie (GDD §4.2). */
  attributes: AttributeDefinition[];
}

/** Sucht eine Attribut-Definition per Schlüssel; `undefined`, wenn unbekannt. */
export function findAttribute(
  category: CategoryDefinition,
  key: string,
): AttributeDefinition | undefined {
  return category.attributes.find((attribute) => attribute.key === key);
}
