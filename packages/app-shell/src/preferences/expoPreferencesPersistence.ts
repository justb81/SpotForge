// On-Device-Persistenz-Adapter der Einstellungen über `expo-file-system`. Die
// einzige Stelle der preferences/, die das Dateisystem berührt (analog zum
// Draft-Adapter). Einstellungen liegen geräte-lokal im App-Document-Verzeichnis.

import { Directory, File, Paths } from "expo-file-system";
import { draftScopeSegment } from "../collection/draft-collection";
import type { PreferencesPersistence } from "./preferencesStore";

/** Dateiname der je App (Mandant) gespeicherten Einstellungen. */
const PREFERENCES_FILE = "preferences.json";

/**
 * {@link PreferencesPersistence} auf Basis von `expo-file-system`, **`appId`-skopiert**
 * (Mandantentrennung, ADR 0002/0012): Einstellungen liegen unter
 * `…/spotforge/<appId>/preferences.json`, sodass zwei White-Label-Apps niemals
 * dieselbe Auswahl teilen. Der Host baut den Store damit (siehe `apps/mobile/App.tsx`):
 *
 * ```ts
 * createPreferencesStore(createExpoPreferencesPersistence(definition.id))
 * ```
 */
export function createExpoPreferencesPersistence(appId: string): PreferencesPersistence {
  const dir = new Directory(Paths.document, "spotforge", draftScopeSegment(appId));
  const file = new File(dir, PREFERENCES_FILE);

  return {
    async read() {
      if (!file.exists) return null;
      return file.text();
    },
    async write(data) {
      if (!dir.exists) dir.create({ intermediates: true });
      file.write(data);
    },
  };
}
