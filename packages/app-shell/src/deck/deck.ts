// Deck-Management (GDD §7.2): reine, RN-/I/O-freie Logik. Ein **Deck** ist eine
// geordnete Auswahl eigener Karten (per `id`) für Battles. Die Sammlung bleibt die
// Quelle der Karten; das Deck referenziert sie nur. Bewusst getrennt von der UI
// (DeckScreen) und der Persistenz (Host), damit die Regeln ohne Expo testbar sind.

import type { Card } from "@spotforge/game-core";

/** Basis-Kapazität eines Decks (GDD §7.2). */
export const DEFAULT_DECK_CAPACITY = 50;

/**
 * Eine Deck-Auswahl: geordnete Liste von Karten-`id`s (Reihenfolge = Hinzufüge-
 * Reihenfolge). Rein serialisierbar, damit der Host sie persistieren kann.
 */
export interface Deck {
  cardIds: string[];
}

/** Leeres Deck als Startwert. Eingefroren, da geteilter Default – Mutationen sind Bugs. */
export const EMPTY_DECK: Deck = Object.freeze({ cardIds: [] as string[] }) as Deck;

/**
 * Deck-Kapazität = Basis (50) + Erweiterungen. `expansions` ist der **Erweiterungs-
 * Hook** (GDD §7.2): Level-Ups oder In-App-Käufe heben die Kapazität, ohne dass die
 * Deck-Logik sich ändert. Negative/gebrochene Werte werden auf ≥ 0 ganzzahlig geklemmt.
 */
export function deckCapacity(expansions = 0): number {
  return DEFAULT_DECK_CAPACITY + Math.max(0, Math.trunc(expansions));
}

/** Anzahl Karten im Deck. */
export function deckSize(deck: Deck): number {
  return deck.cardIds.length;
}

/** Ist die Karte bereits im Deck? */
export function isInDeck(deck: Deck, id: string): boolean {
  return deck.cardIds.includes(id);
}

/** Ist das Deck voll (≥ Kapazität)? */
export function isDeckFull(deck: Deck, capacity = DEFAULT_DECK_CAPACITY): boolean {
  return deck.cardIds.length >= capacity;
}

/** Verbleibende freie Plätze (nie negativ). */
export function deckRemaining(deck: Deck, capacity = DEFAULT_DECK_CAPACITY): number {
  return Math.max(0, capacity - deck.cardIds.length);
}

/**
 * Fügt eine Karte hinzu. **No-op**, wenn sie schon im Deck ist (idempotent) oder das
 * Deck voll ist (die UI verhindert das vorab über {@link isDeckFull}). Reine Funktion –
 * das Eingabe-Deck bleibt unverändert.
 */
export function addToDeck(deck: Deck, id: string, capacity = DEFAULT_DECK_CAPACITY): Deck {
  if (isInDeck(deck, id) || isDeckFull(deck, capacity)) return deck;
  return { cardIds: [...deck.cardIds, id] };
}

/** Entfernt eine Karte (No-op, wenn nicht enthalten). */
export function removeFromDeck(deck: Deck, id: string): Deck {
  if (!isInDeck(deck, id)) return deck;
  return { cardIds: deck.cardIds.filter((cardId) => cardId !== id) };
}

/**
 * Schaltet die Deck-Zugehörigkeit um: enthalten → entfernen, sonst hinzufügen
 * (sofern Platz). Komfort für die Toggle-Interaktion im DeckScreen.
 */
export function toggleInDeck(deck: Deck, id: string, capacity = DEFAULT_DECK_CAPACITY): Deck {
  return isInDeck(deck, id) ? removeFromDeck(deck, id) : addToDeck(deck, id, capacity);
}

/**
 * Entfernt aus dem Deck alle `id`s, die nicht mehr im Besitz sind (z.B. nach dem
 * Löschen einer Karte aus der Sammlung). Hält Deck und Sammlung konsistent.
 */
export function pruneDeck(deck: Deck, ownedIds: Iterable<string>): Deck {
  const owned = new Set(ownedIds);
  const kept = deck.cardIds.filter((id) => owned.has(id));
  return kept.length === deck.cardIds.length ? deck : { cardIds: kept };
}

/**
 * Löst die Deck-`id`s gegen die Sammlung in die zugehörigen Karten auf – in
 * **Deck-Reihenfolge**. `id`s ohne passende Karte (verwaiste Referenzen) werden
 * übersprungen.
 */
export function deckCards(deck: Deck, owned: readonly Card[]): Card[] {
  const byId = new Map(owned.map((card) => [card.id, card]));
  const cards: Card[] = [];
  for (const id of deck.cardIds) {
    const card = byId.get(id);
    if (card) cards.push(card);
  }
  return cards;
}
