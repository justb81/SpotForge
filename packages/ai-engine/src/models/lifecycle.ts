/**
 * Modell-**Lifecycle**: Versionsvergleich, Kompatibilitätsprüfung und der
 * OTA-Update-Ablauf (Hintergrund-Bezug zusätzlich zum gebündelten Basismodell).
 *
 * Das gebündelte Modell bleibt der Offline-Fallback und wird **nicht** entfernt;
 * ein OTA-Update legt eine neuere Version daneben und schaltet erst nach
 * erfolgreicher SHA-256-Verifikation um (atomarer Commit).
 *
 * Reine Logik mit **injizierter I/O** ({@link ModelStorageIO}): kein Netzwerk-,
 * Dateisystem- oder React-Native-Import, damit unter vitest vollständig testbar.
 * Der App-Host reicht eine konkrete Implementierung (expo-file-system + fetch)
 * durch.
 */

import type { ModelArtifact, ModelManifestEntry } from "./manifest";

/** Aktuell installiertes Modell (gebündelt oder per OTA gezogen). */
export interface InstalledModel {
  id: string;
  version: string;
}

/** Kontext der laufenden App für die Kompatibilitätsprüfung. */
export interface UpdateContext {
  /** App-Version (semver „x.y.z"). */
  appVersion: string;
  /** Runtime-Marker, muss zum Manifest-Eintrag passen (z.B. `react-native-executorch@0.9`). */
  runtime: string;
}

/** Geplantes Update: der Manifest-Eintrag, auf den aktualisiert wird. */
export interface UpdatePlan {
  entry: ModelManifestEntry;
  from: string | null;
  to: string;
}

/** Injizierte I/O für den OTA-Bezug (vom App-Host bereitgestellt). */
export interface ModelStorageIO {
  /** Lädt ein Artefakt herunter und liefert die Bytes. */
  download(url: string, onProgress?: (p: number) => void): Promise<Uint8Array>;
  /** Berechnet die SHA-256 (hex, lowercase) über die Bytes. */
  sha256(bytes: Uint8Array): Promise<string>;
  /** Dekodiert Bytes als UTF-8 (z.B. für den Labels-JSON). */
  decodeUtf8(bytes: Uint8Array): string;
  /** Persistiert die verifizierten Bytes unter einer lokalen Kennung; liefert den lokalen Pfad/URI. */
  persist(
    id: string,
    version: string,
    role: "model" | "labels",
    bytes: Uint8Array,
  ): Promise<string>;
}

/** Ergebnis eines durchgeführten Updates: lokale Pfade der neuen Artefakte. */
export interface AppliedUpdate {
  id: string;
  version: string;
  modelPath: string;
  labelsPath?: string;
  labels?: string[];
}

/**
 * Vergleicht zwei semver-Kernversionen „x.y.z" (ohne Pre-Release/Build).
 * @returns negativ, wenn `a < b`; 0 bei Gleichheit; positiv, wenn `a > b`.
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
}

function parseVersion(v: string): [number, number, number] {
  const parts = v.split(".").map((p) => Number.parseInt(p, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/**
 * Prüft, ob ein Modell-Eintrag im aktuellen App-/Runtime-Kontext geladen werden
 * darf: passender Runtime-Marker und `appVersion >= compat.appMin`.
 */
export function isModelCompatible(entry: ModelManifestEntry, ctx: UpdateContext): boolean {
  return entry.runtime === ctx.runtime && compareVersions(ctx.appVersion, entry.compat.appMin) >= 0;
}

/**
 * Wählt das beste OTA-Update für ein Modell: den kompatiblen `ota`-Eintrag mit
 * der höchsten Version, die **neuer** als die installierte ist. Liefert `null`,
 * wenn nichts Passenderes verfügbar ist.
 */
export function selectUpdate(
  installed: InstalledModel,
  available: ModelManifestEntry[],
  ctx: UpdateContext,
): UpdatePlan | null {
  const candidate = available
    .filter(
      (e) =>
        e.id === installed.id &&
        e.distribution === "ota" &&
        isModelCompatible(e, ctx) &&
        compareVersions(e.version, installed.version) > 0,
    )
    .sort((a, b) => compareVersions(b.version, a.version))[0];

  return candidate ? { entry: candidate, from: installed.version, to: candidate.version } : null;
}

/** Lädt ein Artefakt, prüft die SHA-256 und persistiert es. Wirft bei Mismatch. */
async function fetchVerified(
  io: ModelStorageIO,
  id: string,
  version: string,
  role: "model" | "labels",
  artifact: ModelArtifact,
  onProgress?: (p: number) => void,
): Promise<{ path: string; bytes: Uint8Array }> {
  const bytes = await io.download(artifact.url, onProgress);
  const actual = await io.sha256(bytes);
  if (actual !== artifact.sha256) {
    throw new Error(
      `Modell ${id}@${version} (${role}): SHA-256 stimmt nicht. Erwartet ${artifact.sha256}, erhalten ${actual}.`,
    );
  }
  const path = await io.persist(id, version, role, bytes);
  return { path, bytes };
}

/**
 * Führt ein geplantes OTA-Update durch: Modell (und ggf. Labels) herunterladen,
 * **jeweils** SHA-256 verifizieren und persistieren. Erst wenn alle Artefakte
 * gültig sind, gilt das Update als angewandt – andernfalls wirft die Funktion
 * und der gebündelte Fallback bleibt unangetastet.
 */
export async function applyUpdate(
  plan: UpdatePlan,
  io: ModelStorageIO,
  onProgress?: (p: number) => void,
): Promise<AppliedUpdate> {
  const { entry } = plan;
  const model = await fetchVerified(
    io,
    entry.id,
    entry.version,
    "model",
    entry.artifacts.model,
    onProgress,
  );

  let labelsPath: string | undefined;
  let labels: string[] | undefined;
  if (entry.artifacts.labels) {
    const result = await fetchVerified(
      io,
      entry.id,
      entry.version,
      "labels",
      entry.artifacts.labels,
    );
    labelsPath = result.path;
    labels = parseLabels(io.decodeUtf8(result.bytes), entry.id);
  }

  return { id: entry.id, version: entry.version, modelPath: model.path, labelsPath, labels };
}

/** Parst ein Labels-JSON (geordnetes String-Array). */
function parseLabels(json: string, id: string): string[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed) || !parsed.every((l) => typeof l === "string")) {
    throw new Error(`Modell ${id}: Labels sind kein String-Array.`);
  }
  return parsed;
}
