// Reine, RN-/I/O-freie Logik der lokalen Draft-Sammlung: Einfügen/Ersetzen,
// Entfernen, Sortierung und (De-)Serialisierung. Bewusst getrennt vom
// Persistenz-Adapter (siehe draftStore.ts / expoDraftPersistence.ts), damit die
// Sammlungs-Logik ohne Expo/FS testbar bleibt.

import type { Card } from "@spotforge/game-core";

/**
 * Fügt einen Draft ein oder ersetzt einen vorhandenen mit gleicher `id`
 * (idempotent gegen Doppel-Speichern desselben Drafts). Reine Funktion – die
 * Eingabeliste bleibt unverändert.
 */
export function upsertDraft(drafts: readonly Card[], card: Card): Card[] {
  const index = drafts.findIndex((d) => d.id === card.id);
  if (index === -1) return [...drafts, card];
  const next = drafts.slice();
  next[index] = card;
  return next;
}

/** Entfernt den Draft mit der gegebenen `id` (No-op, wenn nicht vorhanden). */
export function removeDraftById(drafts: readonly Card[], id: string): Card[] {
  return drafts.filter((d) => d.id !== id);
}

/**
 * Neueste zuerst (`createdAt` absteigend), stabiler Tiebreak über die `id`, damit
 * die Reihenfolge unabhängig von der Speicher-Reihenfolge deterministisch ist.
 */
export function sortByNewest(drafts: readonly Card[]): Card[] {
  return drafts.slice().sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

/** Serialisiert die Sammlung als JSON (Card ist bewusst rein serialisierbar). */
export function serializeDrafts(drafts: readonly Card[]): string {
  return JSON.stringify(drafts);
}

/**
 * Liest eine Sammlung aus rohem JSON. **Tolerant**: ungültiger/fehlender/korrupter
 * Inhalt liefert eine leere Liste statt zu werfen, und Einträge, die nicht wie eine
 * Karte aussehen, werden verworfen – eine beschädigte Datei legt die App nicht lahm.
 */
export function parseDrafts(raw: string | null | undefined): Card[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(isCard);
}

function isCard(value: unknown): value is Card {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Partial<Card>;
  return (
    typeof c.id === "string" &&
    typeof c.objectName === "string" &&
    typeof c.createdAt === "string" &&
    (c.status === "draft" || c.status === "forged")
  );
}

/**
 * Wandelt eine `appId` (= `AppDefinition.id`, zugleich Mandanten-Key, ADR 0002/0012)
 * in ein dateisystem-sicheres Scope-Segment. So hält jede White-Label-App ihre
 * Drafts strikt getrennt; verhindert zugleich Pfad-Traversal/Separatoren. Reine
 * Funktion, damit die Mandanten-Skopierung ohne Expo testbar ist.
 *
 * @throws {Error} wenn `appId` leer ist.
 */
export function draftScopeSegment(appId: string): string {
  const trimmed = appId.trim();
  if (trimmed === "") {
    throw new Error("draftScopeSegment: appId darf nicht leer sein.");
  }
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}
