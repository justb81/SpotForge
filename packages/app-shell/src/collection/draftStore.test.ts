import { describe, expect, it } from "vitest";
import type { Card } from "@spotforge/game-core";
import { buildDraft } from "@spotforge/game-core";
import { createDraftStore, createInMemoryDraftStore, type DraftPersistence } from "./draftStore";

function draft(id: string, createdAt: string, objectName = "sports car"): Card {
  return buildDraft({
    id,
    categoryId: "vehicles",
    objectName,
    spottedBy: "tester",
    createdAt,
    photoUri: `file:///${id}.jpg`,
  });
}

/** Test-Persistenz mit beobachtbarem Backing-Store (simuliert eine Datei). */
function fakePersistence(initial: string | null = null) {
  const state = { blob: initial, writes: 0 };
  const persistence: DraftPersistence = {
    async read() {
      return state.blob;
    },
    async write(data) {
      state.blob = data;
      state.writes += 1;
    },
  };
  return { persistence, state };
}

describe("createDraftStore", () => {
  it("legt Drafts an und gibt sie neueste-zuerst zurück", async () => {
    const store = createInMemoryDraftStore();
    await store.put(draft("a", "2026-06-01T00:00:00.000Z"));
    const list = await store.put(draft("b", "2026-06-02T00:00:00.000Z"));
    expect(list.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("ist idempotent: erneutes put derselben id ersetzt statt zu duplizieren", async () => {
    const store = createInMemoryDraftStore();
    await store.put(draft("a", "2026-06-01T00:00:00.000Z", "VW Golf"));
    const list = await store.put(draft("a", "2026-06-01T00:00:00.000Z", "VW Golf VII"));
    expect(list).toHaveLength(1);
    expect(list[0]?.objectName).toBe("VW Golf VII");
  });

  it("entfernt Drafts", async () => {
    const store = createInMemoryDraftStore([draft("a", "t1"), draft("b", "t2")]);
    const list = await store.remove("a");
    expect(list.map((d) => d.id)).toEqual(["b"]);
  });

  it("schreibt jede Mutation durch die Persistenz", async () => {
    const { persistence, state } = fakePersistence();
    const store = createDraftStore(persistence);
    await store.put(draft("a", "2026-06-01T00:00:00.000Z"));
    expect(state.writes).toBe(1);
    expect(state.blob).not.toBeNull();
    // Ein frischer Store über demselben Backing-Store liest den Stand zurück
    // (überlebt also „Neustart").
    const reloaded = createDraftStore(persistence);
    const list = await reloaded.list();
    expect(list.map((d) => d.id)).toEqual(["a"]);
  });

  it("lädt eine vorhandene Sammlung sortiert", async () => {
    const seeded = createInMemoryDraftStore();
    await seeded.put(draft("a", "2026-06-01T00:00:00.000Z"));
    await seeded.put(draft("b", "2026-06-03T00:00:00.000Z"));
    const list = await seeded.list();
    expect(list.map((d) => d.id)).toEqual(["b", "a"]);
  });

  it("trennt Mandanten: getrennte Backing-Stores teilen keine Drafts", async () => {
    const cars = fakePersistence();
    const animals = fakePersistence();
    const carsStore = createDraftStore(cars.persistence);
    const animalsStore = createDraftStore(animals.persistence);

    await carsStore.put(draft("c1", "2026-06-01T00:00:00.000Z", "VW Golf"));

    expect((await carsStore.list()).map((d) => d.id)).toEqual(["c1"]);
    expect(await animalsStore.list()).toEqual([]);
  });
});
