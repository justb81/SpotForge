// React-Anbindung des lokalen Draft-Stores: lädt die Sammlung beim Mount und hält
// sie als State, plus Mutationen, die durchschreiben und den State aktualisieren.
// Bewusst der einzige zustandsbehaftete Teil von collection/ – der Store darunter
// ist rein I/O-orientiert, die Sammlungs-Logik darunter rein.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card } from "@spotforge/game-core";
import type { DraftStore } from "./draftStore";

export interface DraftCollection {
  /** Aktuelle Sammlung (neueste zuerst). */
  drafts: Card[];
  /** True, bis die Sammlung initial geladen ist. */
  loading: boolean;
  /** Speichert einen Draft (einfügen/ersetzen) und aktualisiert die Sammlung. */
  saveDraft: (card: Card) => Promise<void>;
  /** Entfernt einen Draft anhand seiner `id`. */
  removeDraft: (id: string) => Promise<void>;
}

/**
 * Lädt und verwaltet die lokale Draft-Sammlung über den injizierten
 * {@link DraftStore}. Setzt nur State, solange die Komponente gemountet ist
 * (vermeidet Updates nach Unmount). Der Store kapselt Persistenz und Mandanten-
 * Skopierung; dieser Hook kennt davon nichts.
 */
export function useDraftCollection(store: DraftStore): DraftCollection {
  const [drafts, setDrafts] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    store
      .list()
      .then((list) => {
        if (mounted.current) {
          setDrafts(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [store]);

  const saveDraft = useCallback(
    async (card: Card) => {
      const next = await store.put(card);
      if (mounted.current) setDrafts(next);
    },
    [store],
  );

  const removeDraft = useCallback(
    async (id: string) => {
      const next = await store.remove(id);
      if (mounted.current) setDrafts(next);
    },
    [store],
  );

  return { drafts, loading, saveDraft, removeDraft };
}
