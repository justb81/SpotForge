// Spezialfähigkeiten von Karten ab Seltenheit Rare (GDD §6.3). **Platzhalter** –
// Effekte, Trigger und Parameter folgen im Spezialfähigkeiten-Issue; hier stehen
// nur die Typen, damit {@link Card} bereits Fähigkeiten tragen kann.

/** Bekannte Fähigkeits-Arten (GDD §6.3). */
export const ABILITY_KINDS = ["turbo", "shield", "wildcard", "fusion", "scout"] as const;

/** Art einer Spezialfähigkeit. */
export type AbilityKind = (typeof ABILITY_KINDS)[number];

/**
 * Eine Spezialfähigkeit einer Karte. Bewusst minimal (Platzhalter): aktuell nur
 * die Art. Effektdaten kommen mit der Implementierung der Fähigkeiten hinzu.
 */
export interface Ability {
  kind: AbilityKind;
}
