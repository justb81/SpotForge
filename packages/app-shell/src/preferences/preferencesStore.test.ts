import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "./preferences";
import {
  createInMemoryPreferencesStore,
  createPreferencesStore,
  type PreferencesPersistence,
} from "./preferencesStore";

describe("PreferencesStore", () => {
  it("lädt die Defaults, solange nichts gespeichert wurde", async () => {
    const store = createInMemoryPreferencesStore();
    expect(await store.load()).toEqual(DEFAULT_PREFERENCES);
  });

  it("persistiert gespeicherte Einstellungen über das nächste Laden", async () => {
    const store = createInMemoryPreferencesStore();
    await store.save({ skipTutorial: true });
    expect(await store.load()).toEqual({ skipTutorial: true });
  });

  it("schreibt durch die injizierte Persistenz (ein einzelner Blob)", async () => {
    let blob: string | null = null;
    const persistence: PreferencesPersistence = {
      async read() {
        return blob;
      },
      async write(data) {
        blob = data;
      },
    };
    const store = createPreferencesStore(persistence);

    await store.save({ skipTutorial: true });
    expect(blob).not.toBeNull();
    // Ein zweiter, frischer Store über derselben Persistenz liest die Auswahl.
    expect(await createPreferencesStore(persistence).load()).toEqual({ skipTutorial: true });
  });
});
