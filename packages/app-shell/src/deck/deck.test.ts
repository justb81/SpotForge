import { describe, expect, it } from "vitest";
import { buildDraft, type Card } from "@spotforge/game-core";
import {
  DEFAULT_DECK_CAPACITY,
  EMPTY_DECK,
  addToDeck,
  deckCapacity,
  deckCards,
  deckRemaining,
  deckSize,
  isDeckFull,
  isInDeck,
  pruneDeck,
  removeFromDeck,
  toggleInDeck,
  type Deck,
} from "./deck";

function card(id: string): Card {
  return buildDraft({
    id,
    categoryId: "vehicles",
    objectName: `Card ${id}`,
    spottedBy: "tester",
    createdAt: "2026-06-20T10:00:00.000Z",
  });
}

describe("deck capacity", () => {
  it("hat die Basis-Kapazität 50 (GDD §7.2)", () => {
    expect(DEFAULT_DECK_CAPACITY).toBe(50);
    expect(deckCapacity()).toBe(50);
  });

  it("hebt die Kapazität über den Erweiterungs-Hook", () => {
    expect(deckCapacity(5)).toBe(55);
    expect(deckCapacity(-3)).toBe(50); // negatives klemmt auf 0
    expect(deckCapacity(2.9)).toBe(52); // bricht auf Ganzzahl
  });
});

describe("deck membership", () => {
  it("fügt hinzu, ist idempotent und entfernt wieder", () => {
    let deck: Deck = EMPTY_DECK;
    deck = addToDeck(deck, "a");
    deck = addToDeck(deck, "a"); // doppeltes Hinzufügen = No-op
    expect(deck.cardIds).toEqual(["a"]);
    expect(isInDeck(deck, "a")).toBe(true);
    expect(deckSize(deck)).toBe(1);

    deck = removeFromDeck(deck, "a");
    expect(deck.cardIds).toEqual([]);
    expect(isInDeck(deck, "a")).toBe(false);
  });

  it("erhält die Hinzufüge-Reihenfolge", () => {
    let deck: Deck = EMPTY_DECK;
    for (const id of ["c", "a", "b"]) deck = addToDeck(deck, id);
    expect(deck.cardIds).toEqual(["c", "a", "b"]);
  });

  it("toggelt die Zugehörigkeit", () => {
    let deck: Deck = EMPTY_DECK;
    deck = toggleInDeck(deck, "x");
    expect(isInDeck(deck, "x")).toBe(true);
    deck = toggleInDeck(deck, "x");
    expect(isInDeck(deck, "x")).toBe(false);
  });

  it("lässt das Eingabe-Deck unverändert (reine Funktionen)", () => {
    const deck: Deck = { cardIds: ["a"] };
    addToDeck(deck, "b");
    removeFromDeck(deck, "a");
    expect(deck.cardIds).toEqual(["a"]);
  });
});

describe("deck capacity enforcement", () => {
  it("blockt Hinzufügen, wenn voll", () => {
    const deck: Deck = { cardIds: ["a", "b"] };
    expect(isDeckFull(deck, 2)).toBe(true);
    expect(deckRemaining(deck, 2)).toBe(0);
    const after = addToDeck(deck, "c", 2);
    expect(after).toBe(deck); // No-op gibt dasselbe Deck zurück
  });

  it("meldet verbleibende Plätze (nie negativ)", () => {
    const deck: Deck = { cardIds: ["a"] };
    expect(deckRemaining(deck, 3)).toBe(2);
    expect(deckRemaining(deck, 0)).toBe(0);
  });
});

describe("deck resolution & pruning", () => {
  it("löst ids in Deck-Reihenfolge auf und überspringt verwaiste", () => {
    const owned = [card("a"), card("b"), card("c")];
    const deck: Deck = { cardIds: ["c", "missing", "a"] };
    expect(deckCards(deck, owned).map((c) => c.id)).toEqual(["c", "a"]);
  });

  it("entfernt nicht mehr besessene Karten", () => {
    const deck: Deck = { cardIds: ["a", "b", "c"] };
    const pruned = pruneDeck(deck, ["a", "c"]);
    expect(pruned.cardIds).toEqual(["a", "c"]);
  });

  it("gibt dasselbe Deck zurück, wenn nichts zu entfernen ist", () => {
    const deck: Deck = { cardIds: ["a", "b"] };
    expect(pruneDeck(deck, ["a", "b", "x"])).toBe(deck);
  });
});
