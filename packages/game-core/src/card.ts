// Die Sammelkarte – das zentrale Domänenobjekt (GDD §4).

import type { Ability } from "./ability";
import type { AttributeKey, AttributeValues } from "./attribute";
import type { CategoryId } from "./category";
import type { Rarity } from "./rarity";

/** Aufwertungsstufe einer Karte (GDD §7.3): 1 = Basis, 2 = aufgewertet, 3 = Foil. */
export type CardLevel = 1 | 2 | 3;

/** Stufe, ab der eine Karte als „Foil" gilt (GDD §7.3). */
export const FOIL_LEVEL: CardLevel = 3;

/**
 * Eine geschmiedete Sammelkarte. Rein serialisierbar (keine Klassen,
 * `createdAt` als ISO-8601-String), damit App (offline) und Server bit-identisch
 * rechnen.
 */
export interface Card {
  /** Eindeutige ID der Karte (z.B. UUID). */
  id: string;
  /** Kategorie, zu der das gespottete Objekt gehört. */
  categoryId: CategoryId;
  /** Erkanntes Objekt (z.B. "VW Golf VII"). */
  objectName: string;
  /** Attributwerte; Schlüssel = `key`s der Kategorie-Attribute (GDD §4.2). */
  attributes: AttributeValues;
  /** Algorithmisch bestimmte Seltenheit (GDD §5.3). */
  rarity: Rarity;
  /** Spezialfähigkeiten; leer unterhalb von Rare (GDD §6.3). */
  abilities: Ability[];
  /** Aufwertungsstufe (GDD §7.3). */
  level: CardLevel;
  /** Entdecker-Tag (Creator-Ownership, GDD §15). */
  spottedBy: string;
  /** Erstellungszeitpunkt als ISO-8601-String. */
  createdAt: string;
  /** Grobe Fundregion (PLZ/Region); optional – Privacy-first (GDD §10.4). */
  geoRegion?: string;
}

/** Ob die Karte eine Foil-Version ist (höchste Stufe, GDD §7.3). */
export function isFoil(card: Card): boolean {
  return card.level >= FOIL_LEVEL;
}

/**
 * Liest den Wert eines Attributs einer Karte. `undefined`, wenn die Karte für
 * den Schlüssel keinen Wert trägt.
 */
export function getAttributeValue(card: Card, key: AttributeKey): number | undefined {
  return card.attributes[key];
}
