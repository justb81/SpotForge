// Kartenbibliothek: reine Filter-/Sortier-Logik über einer Karten-Sammlung
// (GDD §7.2). RN-/I/O-frei, damit ohne Renderer testbar. Die Sammlung enthält
// Drafts (offline gespottet) und – sobald der Online-Forge-Pfad steht (#81) –
// geforgte Karten; die Logik ist über beide generisch.

import { compareRarity, type Card, type CardStatus, type Rarity } from "@spotforge/game-core";
import { sortByNewest } from "./draft-collection";

/** Sortier-Kriterien der Bibliothek (stabile Reihenfolge für die UI). */
export const LIBRARY_SORTS = ["newest", "oldest", "name", "rarity"] as const;

export type LibrarySort = (typeof LIBRARY_SORTS)[number];

/** Aktive Einschränkungen; jedes Feld ist optional (fehlt = keine Einschränkung). */
export interface LibraryFilter {
  /** Freitextsuche über den Objektnamen (case-insensitiv, getrimmt). Leer = alle. */
  search?: string;
  /** Nur Karten dieser Seltenheit. */
  rarity?: Rarity;
  /** Nur Karten dieses Lebenszyklus-Status (`draft`/`forged`). */
  status?: CardStatus;
}

/** Filtert die Sammlung gemäß {@link LibraryFilter}. Reine Funktion. */
export function filterCards(cards: readonly Card[], filter: LibraryFilter = {}): Card[] {
  const search = filter.search?.trim().toLowerCase() ?? "";
  return cards.filter((card) => {
    if (filter.status !== undefined && card.status !== filter.status) return false;
    if (filter.rarity !== undefined && card.rarity !== filter.rarity) return false;
    if (search !== "" && !card.objectName.toLowerCase().includes(search)) return false;
    return true;
  });
}

/**
 * Sortiert die Sammlung. `newest`/`oldest` nach Erstellungszeit, `name` alphabetisch
 * nach Objektname, `rarity` seltenste zuerst. Alle Kriterien sind **deterministisch**
 * (stabiler Tiebreak), damit die Reihenfolge nicht von der Speicher-Reihenfolge abhängt.
 */
export function sortCards(cards: readonly Card[], sort: LibrarySort): Card[] {
  switch (sort) {
    case "newest":
      return sortByNewest(cards);
    case "oldest":
      return sortByNewest(cards).reverse();
    case "name":
      return cards.slice().sort((a, b) => {
        const byName = a.objectName.localeCompare(b.objectName);
        if (byName !== 0) return byName;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    case "rarity":
      // Seltenste zuerst; bei gleicher Seltenheit die neuesten oben.
      return cards.slice().sort((a, b) => {
        const byRarity = compareRarity(b.rarity, a.rarity);
        if (byRarity !== 0) return byRarity;
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
  }
}

/** Filter + Sortierung in einem Schritt. */
export interface LibraryQuery {
  sort?: LibrarySort;
  filter?: LibraryFilter;
}

/** Wendet Filter und anschließend Sortierung an (Default: `newest`, kein Filter). */
export function queryLibrary(cards: readonly Card[], query: LibraryQuery = {}): Card[] {
  return sortCards(filterCards(cards, query.filter), query.sort ?? "newest");
}
