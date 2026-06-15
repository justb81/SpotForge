// Die Sammelkarte – das zentrale Domänenobjekt (GDD §4).

import type { Ability } from "./ability";
import type { AttributeKey, AttributeValues } from "./attribute";
import type { CategoryId } from "./category";
import { Rarity } from "./rarity";

/** Aufwertungsstufe einer Karte (GDD §7.3): 1 = Basis, 2 = aufgewertet, 3 = Foil. */
export type CardLevel = 1 | 2 | 3;

/** Stufe, ab der eine Karte als „Foil" gilt (GDD §7.3). */
export const FOIL_LEVEL: CardLevel = 3;

/**
 * Lebenszyklus-Status einer Karte (ADR 0010): `draft` entsteht **on-device** beim
 * Spotten (offline), `forged` entsteht **server-autoritativ** beim Forgen (#76).
 */
export type CardStatus = "draft" | "forged";

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
  /** Lebenszyklus-Status (ADR 0010): `draft` → `forged`. */
  status: CardStatus;
  /** Grobe Fundregion (PLZ/Region); optional – Privacy-first (GDD §10.4). */
  geoRegion?: string;
  /**
   * Lokale URI des beim Spotten aufgenommenen Fotos (Draft). Privacy-first: das
   * Foto verlässt das Gerät nicht ungefragt (§10.4); Auto-Crop ist späteres Thema (#75).
   */
  photoUri?: string;
  /**
   * Vom Spieler vorgeschlagene/korrigierte Attributwerte am Draft – Input für die
   * Online-Schmiede (#76). Autoritative Werte stehen nach dem Forgen in {@link Card.attributes}.
   */
  proposedAttributes?: AttributeValues;
  /** Card-Art-Bild (#11); beim/nach dem Forgen erzeugt. */
  artUri?: string;
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

/**
 * Platzhalter-Seltenheit eines **Drafts**: bis zum (server-autoritativen) Forgen
 * trägt eine Karte keine echte Seltenheit (ADR 0009/0010). {@link buildDraft}
 * setzt diesen Wert; die Online-Schmiede (#76) ersetzt ihn durch die berechnete Stufe.
 */
export const PLACEHOLDER_RARITY: Rarity = Rarity.Common;

/** Eingabe für {@link buildDraft} – das, was beim On-Device-Spotten bekannt ist. */
export interface BuildDraftInput {
  /** Eindeutige ID der Karte (z.B. UUID). */
  id: string;
  /** Kategorie der App/des Objekts. */
  categoryId: CategoryId;
  /** Erkanntes Objekt (z.B. "VW Golf VII"). */
  objectName: string;
  /** Entdecker-Tag (Creator-Ownership, GDD §15). */
  spottedBy: string;
  /** Erstellungszeitpunkt als ISO-8601-String. */
  createdAt: string;
  /** Lokale URI des aufgenommenen Fotos. */
  photoUri?: string;
  /** Provisorische/vorgeschlagene Attribute (Offline-Vorschläge oder Spieler-Eingabe). */
  proposedAttributes?: AttributeValues;
  /** Grobe Fundregion (PLZ/Region). */
  geoRegion?: string;
}

/**
 * Baut eine **Draft-Karte** (Status `draft`) aus dem, was beim On-Device-Spotten
 * bekannt ist (ADR 0010). Rein & deterministisch (kein I/O). Autoritative
 * Attribute und Seltenheit kommen erst beim Forgen (Server, #76) hinzu; bis dahin
 * sind `attributes` leer und `rarity` ist {@link PLACEHOLDER_RARITY}.
 */
export function buildDraft(input: BuildDraftInput): Card {
  return {
    id: input.id,
    categoryId: input.categoryId,
    objectName: input.objectName,
    attributes: {},
    rarity: PLACEHOLDER_RARITY,
    abilities: [],
    level: 1,
    status: "draft",
    spottedBy: input.spottedBy,
    createdAt: input.createdAt,
    ...(input.geoRegion !== undefined ? { geoRegion: input.geoRegion } : {}),
    ...(input.photoUri !== undefined ? { photoUri: input.photoUri } : {}),
    ...(input.proposedAttributes !== undefined
      ? { proposedAttributes: input.proposedAttributes }
      : {}),
  };
}
