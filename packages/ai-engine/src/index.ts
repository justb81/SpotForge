// @spotforge/ai-engine — öffentliche Einstiegspunkte.
//
// On-Device-Pipeline: Klassifikation → Fakten → Card → Card-Art. Siehe README.md.

export type { Classifier, ClassifierInput, ClassificationResult } from "./classifier";
export { createClassifier } from "./executorch/createClassifier";
export type { ModelSource } from "./executorch/createClassifier";

// Geplante Verträge (noch nicht implementiert):
//
//   export interface FactLookup { /* find(objectId) */ }
//   export interface CardArtGenerator { /* generate(card) */ }
//   export function forgeCard(/* ... */) { /* orchestriert die Pipeline */ }
