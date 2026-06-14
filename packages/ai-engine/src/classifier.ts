/**
 * Minimale Klassifikations-Verträge des PoC (#50).
 *
 * Bewusst entkoppelt von den game-core-Domänentypen (#2): der PoC liefert nur
 * Label + Konfidenz, noch keine Card. Die vollständige Pipeline-Orchestrierung
 * (`forgeCard`, Guardrails, FactLookup) folgt in #8.
 */

/** Eingabe für die Klassifikation: ein vorbereitetes, quadratisches JPEG. */
export interface ClassifierInput {
  /** Base64-kodiertes JPEG in Modell-Eingabegröße (z.B. 224×224). */
  base64Jpeg: string;
}

/** Ergebnis einer Klassifikation. */
export interface ClassificationResult {
  /** Erkanntes Label (Klartext). */
  label: string;
  /** Konfidenz 0..1 (Softmax-Wahrscheinlichkeit der Top-Klasse). */
  confidence: number;
}

/** On-Device-Klassifikator. Implementierungen kapseln Modell und Vorverarbeitung. */
export interface Classifier {
  classify(input: ClassifierInput): Promise<ClassificationResult>;
}
