// Store für die Nutzer-Einstellungen: kapselt (De-)Serialisierung hinter einem
// schmalen load/save-Interface und schreibt durch eine injizierte Persistenz.
// I/O-agnostisch (on-device via expo-file-system, In-Memory für Tests) – analog
// zum Draft-Store.

import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  serializePreferences,
  type Preferences,
} from "./preferences";

/**
 * Roh-Persistenz für die Einstellungen: ein einzelner serialisierter Blob (JSON).
 * Minimal gehalten – ein Adapter muss nur einen String lesen/schreiben können.
 */
export interface PreferencesPersistence {
  /** Liest den gespeicherten JSON-Blob; `null`, wenn noch nichts gespeichert wurde. */
  read(): Promise<string | null>;
  /** Schreibt den JSON-Blob (überschreibt vollständig). */
  write(data: string): Promise<void>;
}

/** Schmales Laden/Speichern der Einstellungen über einer {@link PreferencesPersistence}. */
export interface PreferencesStore {
  /** Liest die gespeicherten Einstellungen (Defaults, falls nichts/beschädigt). */
  load(): Promise<Preferences>;
  /** Schreibt die Einstellungen vollständig zurück. */
  save(preferences: Preferences): Promise<void>;
}

/** Baut einen {@link PreferencesStore} über einer {@link PreferencesPersistence}. */
export function createPreferencesStore(persistence: PreferencesPersistence): PreferencesStore {
  return {
    async load() {
      return parsePreferences(await persistence.read());
    },
    async save(preferences) {
      await persistence.write(serializePreferences(preferences));
    },
  };
}

/**
 * In-Memory-{@link PreferencesStore} (keine Persistenz über App-Neustarts).
 * Default in {@link SpotForgeApp}, solange der Host keinen persistenten Store
 * injiziert, und praktisch für Tests/Non-Native-Hosts.
 */
export function createInMemoryPreferencesStore(
  initial: Preferences = DEFAULT_PREFERENCES,
): PreferencesStore {
  let blob = serializePreferences(initial);
  return createPreferencesStore({
    async read() {
      return blob;
    },
    async write(data) {
      blob = data;
    },
  });
}
