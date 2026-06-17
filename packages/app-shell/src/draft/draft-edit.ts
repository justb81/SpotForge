// Reine Bearbeitungs-Logik für **Drafts** (ADR 0010, GDD §5.1): Korrektur von
// Marke/Modell und Vorschlagen von Attributwerten, bevor der Draft (online,
// server-autoritativ #76) geforgt wird. Ohne RN/I/O → unter vitest testbar.

import type {
  AttributeDefinition,
  AttributeKey,
  AttributeValues,
  Card,
} from "@spotforge/game-core";

/** Editor-Eingaben: Attribut-Schlüssel → roher Texteingabewert. */
export type AttributeInputs = Record<AttributeKey, string>;

/**
 * Parst eine rohe Texteingabe in einen Attributwert. Akzeptiert Dezimal-Komma
 * **und** -Punkt; leere, nicht-numerische oder nicht-endliche Eingaben ergeben
 * `undefined` (das Attribut wird dann nicht vorgeschlagen).
 */
export function parseAttributeInput(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const value = Number(trimmed.replace(",", "."));
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Verdichtet die Editor-Eingaben zu vorgeschlagenen Attributwerten. Es werden
 * **nur** Schlüssel des Kategorienschemas (`defs`) berücksichtigt – das Schema ist
 * die Quelle der Wahrheit; leere/ungültige Eingaben fallen weg.
 */
export function collectProposedAttributes(
  inputs: AttributeInputs,
  defs: AttributeDefinition[],
): AttributeValues {
  const values: AttributeValues = {};
  for (const def of defs) {
    const value = parseAttributeInput(inputs[def.key] ?? "");
    if (value !== undefined) values[def.key] = value;
  }
  return values;
}

/**
 * Vorbelegung der Editor-Eingaben aus den bereits am Draft vorgeschlagenen
 * Attributen (z.B. provisorische Offline-Vorschläge, #10); ohne Wert → leerer String.
 */
export function draftAttributeInputs(draft: Card, defs: AttributeDefinition[]): AttributeInputs {
  const inputs: AttributeInputs = {};
  for (const def of defs) {
    const value = draft.proposedAttributes?.[def.key];
    inputs[def.key] = value !== undefined ? String(value) : "";
  }
  return inputs;
}

/** Korrekturen, die der Spieler am Draft vornimmt (Marke/Modell + Attribut-Vorschläge). */
export interface DraftEdits {
  /** Korrigierter Objektname; leer ⇒ der bisherige Name bleibt erhalten. */
  objectName?: string;
  /** Vorgeschlagene Attributwerte; leer ⇒ es wird kein Vorschlag gesetzt. */
  proposedAttributes?: AttributeValues;
}

/**
 * Wendet Spieler-Korrekturen auf einen **Draft** an und liefert eine **neue** Karte
 * (rein, kein Mutieren). Der Objektname wird getrimmt und fällt bei leerer Eingabe
 * auf den bisherigen zurück; leere Attribut-Vorschläge lassen das Feld weg (kein
 * `{}` hinterlassen). Greift nur an Drafts – eine bereits geforgte Karte wird
 * unverändert zurückgegeben, da Korrekturen vor das (server-autoritative) Forgen
 * gehören.
 */
export function applyDraftEdits(draft: Card, edits: DraftEdits): Card {
  if (draft.status !== "draft") return draft;
  const trimmedName = edits.objectName?.trim();
  const proposed = edits.proposedAttributes;
  const hasProposed = proposed !== undefined && Object.keys(proposed).length > 0;
  // `proposedAttributes` bewusst neu setzen statt mergen: der Editor liefert stets
  // den vollständigen Vorschlag.
  const { proposedAttributes: _drop, ...rest } = draft;
  return {
    ...rest,
    objectName: trimmedName ? trimmedName : draft.objectName,
    ...(hasProposed ? { proposedAttributes: proposed } : {}),
  };
}

/**
 * Anzeige-Transform für die Karten-Vorschau eines Drafts: zeigt die vom Spieler
 * vorgeschlagenen Werte als Karten-Stats an, solange die autoritativen
 * {@link Card.attributes} (Forgen, #76) noch leer sind. Verändert den Draft nicht.
 */
export function draftPreviewCard(draft: Card): Card {
  if (draft.status !== "draft" || draft.proposedAttributes === undefined) return draft;
  return { ...draft, attributes: draft.proposedAttributes };
}
