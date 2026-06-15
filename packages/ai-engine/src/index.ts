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

// Zwei-Stufen-Kaskade (Gate → Feinmodell, beide gebündelt).
export { evaluateGate, createCascadeClassifier } from "./cascade";
export type {
  GateConfig,
  GateDecision,
  CascadeResult,
  CascadeClassifier,
  CascadeOptions,
} from "./cascade";

export { createClassifier } from "./executorch/createClassifier";
export type {
  ModelSource,
  PreprocessorConfig,
  ClassifierModel,
  BuiltinImageNetModel,
  CustomClassifierModel,
  CreateClassifierOptions,
} from "./executorch/createClassifier";

// Modell-Manifest (Source of Truth für die gebündelten Modell-Artefakte).
export { MANIFEST_SCHEMA_VERSION, parseManifest } from "./models/manifest";
export type { ModelManifest, ModelManifestEntry, ModelArtifact } from "./models/manifest";

// Geplante Verträge (noch nicht implementiert):
//
//   export interface FactLookup { /* find(objectId) */ }
//   export interface CardArtGenerator { /* generate(card) */ }
//   export function forgeCard(/* ... */) { /* orchestriert die Pipeline */ }
