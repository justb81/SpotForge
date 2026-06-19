// Der lokale Draft-Store: kapselt die Sammlungs-Logik (draft-collection.ts) hinter
// einem schmalen CRUD-Interface und schreibt jede Änderung durch eine injizierte
// Persistenz. Der konkrete Persistenz-Adapter (on-device via expo-file-system,
// In-Memory für Tests) wird hereingereicht – so bleibt der Store I/O-agnostisch.

import type { Card } from "@spotforge/game-core";
import {
  parseDrafts,
  removeDraftById,
  serializeDrafts,
  sortByNewest,
  upsertDraft,
} from "./draft-collection";

/** Schmales CRUD über die lokale Draft-Sammlung. Jede Mutation gibt den neuen Stand zurück. */
export interface DraftStore {
  /** Aktuelle Sammlung (neueste zuerst). */
  list(): Promise<Card[]>;
  /** Speichert (fügt ein/ersetzt) einen Draft und liefert die neue Sammlung. */
  put(card: Card): Promise<Card[]>;
  /** Entfernt einen Draft anhand seiner `id` und liefert die neue Sammlung. */
  remove(id: string): Promise<Card[]>;
}

/**
 * Roh-Persistenz, auf die der Store schreibt: ein einzelner serialisierter Blob
 * (die gesamte Sammlung als JSON). Bewusst minimal – ein Adapter muss nur einen
 * String lesen/schreiben können (Datei, In-Memory, …).
 */
export interface DraftPersistence {
  /** Liest den gespeicherten JSON-Blob; `null`, wenn noch nichts gespeichert wurde. */
  read(): Promise<string | null>;
  /** Schreibt den JSON-Blob (überschreibt vollständig). */
  write(data: string): Promise<void>;
}

/**
 * Baut einen {@link DraftStore} über einer {@link DraftPersistence}. Hält die
 * Sammlung nach dem ersten Laden im Speicher (eine Store-Instanz = ein Mandant) und
 * schreibt bei jeder Mutation den vollständigen Stand zurück (kleine Datenmenge;
 * einfache, robuste Strategie ohne Teil-Schreibkonflikte).
 */
export function createDraftStore(persistence: DraftPersistence): DraftStore {
  let cache: Card[] | null = null;

  async function load(): Promise<Card[]> {
    if (cache === null) {
      cache = sortByNewest(parseDrafts(await persistence.read()));
    }
    return cache;
  }

  async function commit(next: Card[]): Promise<Card[]> {
    cache = sortByNewest(next);
    await persistence.write(serializeDrafts(cache));
    return cache;
  }

  return {
    async list() {
      return load();
    },
    async put(card) {
      return commit(upsertDraft(await load(), card));
    },
    async remove(id) {
      return commit(removeDraftById(await load(), id));
    },
  };
}

/**
 * In-Memory-{@link DraftStore} (keine Persistenz über App-Neustarts). Default in
 * {@link SpotForgeApp}, solange der Host keinen persistenten Store injiziert, und
 * praktisch für Tests/Non-Native-Hosts.
 */
export function createInMemoryDraftStore(initial: readonly Card[] = []): DraftStore {
  let blob = serializeDrafts(initial);
  return createDraftStore({
    async read() {
      return blob;
    },
    async write(data) {
      blob = data;
    },
  });
}
