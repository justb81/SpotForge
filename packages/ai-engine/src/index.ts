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
export { evaluateGate, createCascadeClassifier, GATE_TOP_K, formatCascadeTimings } from "./cascade";
export type {
  GateConfig,
  GateDecision,
  CascadeResult,
  CascadeTimings,
  CascadeClassifier,
  CascadeOptions,
} from "./cascade";

export { createClassifier } from "./executorch/createClassifier";
export type {
  ModelSource,
  PreprocessorConfig,
  ClassifierModel,
  CreateClassifierOptions,
} from "./executorch/createClassifier";

// Modell-Manifest (Source of Truth für die gebündelten Modell-Artefakte).
export { MANIFEST_SCHEMA_VERSION, parseManifest } from "./models/manifest";
export type { ModelManifest, ModelManifestEntry, ModelArtifact } from "./models/manifest";

// Spot-Pipeline (On-Device): Foto → Draft (ADR 0010). Das Forgen ist online (#76).
export { createSpot, gateConfigFromAppDefinition, slugLabelResolver } from "./spot";
export type {
  SpotInput,
  SpotResult,
  SpotDeps,
  Resolution,
  LabelResolver,
  FactRecord,
  FactLookup,
} from "./spot";

// Foto-Sanitisierung (On-Device): Rohfoto → upload-bereites, bereinigtes Bild (#89).
export { createPhotoSanitizer, SanitizationError } from "./sanitize";
export type {
  BlurTargetKind,
  BlurRegion,
  DetectorInput,
  RegionDetector,
  ProcessImageRequest,
  ProcessedImage,
  ImageProcessor,
  SanitizeDeps,
  SanitizeInput,
  SanitizationReport,
  SanitizeResult,
} from "./sanitize";
