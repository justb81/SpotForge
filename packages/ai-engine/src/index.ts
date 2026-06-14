// @spotforge/ai-engine — öffentliche Einstiegspunkte.
//
// On-Device-Pipeline: Klassifikation → Fakten → Card → Card-Art. Siehe README.md.

export type {
  Classifier,
  ClassifierInput,
  ClassificationCandidate,
  ClassificationResult,
} from "./classifier";
export { selectTopK } from "./select-top-k";

export { createClassifier } from "./executorch/createClassifier";
export type {
  ModelSource,
  PreprocessorConfig,
  ClassifierModel,
  BuiltinImageNetModel,
  CustomClassifierModel,
  CreateClassifierOptions,
} from "./executorch/createClassifier";

// Modell-Lifecycle (Versionierung, Kompatibilität, OTA-Updates).
export { MANIFEST_SCHEMA_VERSION, parseManifest } from "./models/manifest";
export type {
  ModelManifest,
  ModelManifestEntry,
  ModelArtifact,
  ModelCompat,
} from "./models/manifest";
export { compareVersions, isModelCompatible, selectUpdate, applyUpdate } from "./models/lifecycle";
export type {
  InstalledModel,
  UpdateContext,
  UpdatePlan,
  ModelStorageIO,
  AppliedUpdate,
} from "./models/lifecycle";

// Geplante Verträge (noch nicht implementiert):
//
//   export interface FactLookup { /* find(objectId) */ }
//   export interface CardArtGenerator { /* generate(card) */ }
//   export function forgeCard(/* ... */) { /* orchestriert die Pipeline */ }
