// On-Device-Persistenz-Adapter der Draft-Sammlung über `expo-file-system`. Die
// **einzige** Stelle der collection/, die das Dateisystem berührt (analog zu
// SpotCamera/pickImage für Kamera/Galerie) – die Sammlungs-Logik selbst bleibt
// rein. Privacy-first: die Sammlung liegt nur im App-Document-Verzeichnis; Fotos
// werden als lokale URIs referenziert und verlassen das Gerät nicht (ADR 0010).

import { Directory, File, Paths } from "expo-file-system";
import type { DraftPersistence } from "./draftStore";
import { draftScopeSegment } from "./draft-collection";

/** Dateiname der je App (Mandant) gespeicherten Sammlung. */
const DRAFTS_FILE = "drafts.json";

/**
 * {@link DraftPersistence} auf Basis von `expo-file-system`, **`appId`-skopiert**
 * (Mandantentrennung, ADR 0002/0012): Drafts liegen unter
 * `…/spotforge/<appId>/drafts.json`, sodass zwei White-Label-Apps niemals dieselbe
 * Sammlung sehen. Der Host baut den Store damit (siehe `apps/mobile/App.tsx`):
 *
 * ```ts
 * createDraftStore(createExpoDraftPersistence(definition.id))
 * ```
 */
export function createExpoDraftPersistence(appId: string): DraftPersistence {
  const dir = new Directory(Paths.document, "spotforge", draftScopeSegment(appId));
  const file = new File(dir, DRAFTS_FILE);

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
