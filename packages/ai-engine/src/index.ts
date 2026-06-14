// @spotforge/ai-engine — öffentliche Einstiegspunkte.
//
// On-Device-Pipeline: Klassifikation → Fakten → Card → Card-Art. Siehe README.md.

export type { Classifier, ClassifierInput, ClassificationResult } from "./classifier";
export { createMobileNetClassifier } from "./mobilenet/MobileNetClassifier";

// Geplante Verträge (noch nicht implementiert):
//
//   export interface FactLookup { /* find(objectId) */ }
//   export interface CardArtGenerator { /* generate(card) */ }
//   export function forgeCard(/* ... */) { /* orchestriert die Pipeline */ }
