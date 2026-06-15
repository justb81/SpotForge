/**
 * Typen und Parser für das **Modell-Manifest** (`tools/fetch-models/models.manifest.json`,
 * `schemaVersion: 3`). Das Manifest ist die Source of Truth für jedes
 * **gebündelte** Modell-Artefakt: Bezugsquelle, Prüfsumme, Version und Kategorie.
 *
 * Alle Modelle werden **fest ins APK gebündelt** (je Variante) – kein Nachladen,
 * kein OTA. `tools/fetch-models` zieht die Artefakte anhand dieses Manifests
 * **vor dem Build** und verifiziert die SHA-256.
 *
 * Rein und seiteneffektfrei (keine React-Native-/Node-Abhängigkeit), damit der
 * Build-Schritt und vitest dieselbe Definition nutzen.
 */

export const MANIFEST_SCHEMA_VERSION = 3;

/** Eine bezieh- und prüfbare Datei (Modell-Binary oder Label-Satz). */
export interface ModelArtifact {
  /** Bezugs-URL (z.B. GitHub-Release-Asset), aus der vor dem Build gebündelt wird. */
  url: string;
  /** Zielpfad relativ zur Repo-Wurzel (wohin `fetch-models` das Artefakt legt). */
  dest: string;
  /** Erwartete SHA-256 (hex, lowercase). */
  sha256: string;
  /** Größe in Bytes (Information/Budget-Prüfung). */
  bytes: number;
}

/** Ein Modell-Eintrag im Manifest. */
export interface ModelManifestEntry {
  /** Stabile Kennung (z.B. `cars-jordo23`). */
  id: string;
  /** Anzeigename / Kurzbeschreibung. */
  name: string;
  /** Modell-Version (semver „x.y.z"); steigt bei jedem Re-Export. */
  version: string;
  /** Kategorie-Bezug (`CategoryId` oder `imagenet` für das generische Gate-Modell). */
  category: string;
  /**
   * Per-Kanal-Normalisierung; `null` = Library/Runtime stellt sie selbst
   * (eingebaute Modelle).
   */
  preprocessor: { normMean: [number, number, number]; normStd: [number, number, number] } | null;
  /** Artefakte: das Modell und – bei eigenen Modellen – der Label-Satz. */
  artifacts: {
    model: ModelArtifact;
    /** Geordnete Labels (JSON-Array); entfällt bei eingebauten Modellen. */
    labels?: ModelArtifact;
  };
}

export interface ModelManifest {
  schemaVersion: number;
  models: ModelManifestEntry[];
}

/**
 * Parst und validiert ein Manifest-Objekt (z.B. aus geparstem JSON). Wirft bei
 * falschem Schema – bewusst streng, damit ein kaputtes Manifest früh auffällt.
 */
export function parseManifest(raw: unknown): ModelManifest {
  if (!isRecord(raw)) {
    throw new Error("Manifest: kein Objekt.");
  }
  if (raw.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    throw new Error(
      `Manifest: schemaVersion ${String(raw.schemaVersion)} != ${MANIFEST_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(raw.models)) {
    throw new Error("Manifest: 'models' ist kein Array.");
  }
  return { schemaVersion: MANIFEST_SCHEMA_VERSION, models: raw.models.map(parseEntry) };
}

function parseEntry(raw: unknown, index: number): ModelManifestEntry {
  if (!isRecord(raw)) {
    throw new Error(`Manifest: models[${index}] ist kein Objekt.`);
  }
  const id = requireString(raw.id, `models[${index}].id`);
  const artifacts = raw.artifacts;
  if (!isRecord(artifacts)) {
    throw new Error(`Manifest: ${id}.artifacts fehlt.`);
  }
  return {
    id,
    name: requireString(raw.name, `${id}.name`),
    version: requireString(raw.version, `${id}.version`),
    category: requireString(raw.category, `${id}.category`),
    preprocessor: parsePreprocessor(raw.preprocessor, id),
    artifacts: {
      model: parseArtifact(artifacts.model, `${id}.artifacts.model`),
      labels:
        artifacts.labels === undefined
          ? undefined
          : parseArtifact(artifacts.labels, `${id}.artifacts.labels`),
    },
  };
}

function parsePreprocessor(raw: unknown, id: string): ModelManifestEntry["preprocessor"] {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!isRecord(raw) || !isTriple(raw.normMean) || !isTriple(raw.normStd)) {
    throw new Error(`Manifest: ${id}.preprocessor braucht normMean/normStd als 3er-Array.`);
  }
  return { normMean: raw.normMean, normStd: raw.normStd };
}

function parseArtifact(raw: unknown, path: string): ModelArtifact {
  if (!isRecord(raw)) {
    throw new Error(`Manifest: ${path} ist kein Objekt.`);
  }
  return {
    url: requireString(raw.url, `${path}.url`),
    dest: requireString(raw.dest, `${path}.dest`),
    sha256: requireString(raw.sha256, `${path}.sha256`),
    bytes: typeof raw.bytes === "number" ? raw.bytes : 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTriple(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number");
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Manifest: ${path} fehlt oder ist leer.`);
  }
  return value;
}
