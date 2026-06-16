// Manueller Draft (Fallback bei `unrecognized`, GDD §5.1): liefert das Feinmodell
// nichts Zuordenbares, benennt der Spieler das Objekt selbst → `draft` der App-
// Kategorie. Die Überprüfung/Freigabe ist Sache der Kuratierung (#77). Nutzt nur
// die reine Domäne (game-core) – kein ai-engine/RN → unter vitest testbar.

import { buildDraft, type Card } from "@spotforge/game-core";
import type { AppDefinition } from "@spotforge/app-config";
import { localDraftId, nowIso } from "../spotting/ids";

/** Eingaben für einen manuell angelegten Draft. */
export interface ManualDraftInput {
  /** Vom Spieler eingegebener Objektname (Marke/Modell). */
  objectName: string;
  /** Lokale URI des aufgenommenen Fotos. */
  photoUri: string;
  /** Entdecker-Tag. */
  spottedBy: string;
  /** Grobe Fundregion (PLZ/Region), optional. */
  geoRegion?: string;
}

/** Injizierbare ID-/Zeitquellen (für deterministische Tests). */
export interface ManualDraftDeps {
  newId?: () => string;
  now?: () => string;
}

/**
 * Legt aus Foto + vom Spieler benanntem Objekt einen `draft` der App-Kategorie an.
 * Der Name wird getrimmt; Attribute bleiben leer (Vorschläge folgen im Editor).
 */
export function buildManualDraft(
  definition: AppDefinition,
  input: ManualDraftInput,
  deps: ManualDraftDeps = {},
): Card {
  return buildDraft({
    id: (deps.newId ?? localDraftId)(),
    categoryId: definition.category.primary,
    objectName: input.objectName.trim(),
    spottedBy: input.spottedBy,
    createdAt: (deps.now ?? nowIso)(),
    photoUri: input.photoUri,
    ...(input.geoRegion !== undefined ? { geoRegion: input.geoRegion } : {}),
  });
}
