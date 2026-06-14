import type { ClassificationCandidate, ClassificationResult } from "./classifier";

/**
 * Wandelt die von ExecuTorch gelieferte Label→Wahrscheinlichkeits-Map in ein
 * {@link ClassificationResult} um: absteigend sortiert, auf die Top-k gekürzt.
 *
 * Rein und seiteneffektfrei (ohne React-Native-Abhängigkeit), damit unter
 * vitest testbar – {@link createClassifier} reicht nur die Roh-Scores durch.
 *
 * @param scores  Label→Wahrscheinlichkeit (Softmax bereits angewandt).
 * @param topK    Maximale Anzahl Kandidaten (>=1).
 */
export function selectTopK(scores: Record<string, number>, topK = 5): ClassificationResult {
  const candidates: ClassificationCandidate[] = Object.entries(scores)
    .map(([label, confidence]) => ({ label, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, Math.max(1, topK));

  // Contract: stets mindestens die Top-1 (auch bei – praktisch nicht
  // auftretenden – leeren Scores).
  const top = candidates[0] ?? { label: "", confidence: 0 };
  return {
    label: top.label,
    confidence: top.confidence,
    candidates: candidates.length ? candidates : [top],
  };
}
