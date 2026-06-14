/**
 * Minimale Klassifikations-Verträge des PoC (#50).
 *
 * Bewusst entkoppelt von den game-core-Domänentypen (#2): der PoC liefert nur
 * Label + Konfidenz, noch keine Card. Die vollständige Pipeline-Orchestrierung
 * (`forgeCard`, Guardrails, FactLookup) folgt in #8.
 */

/** Eingabe für die Klassifikation: die lokale URI eines aufgenommenen Fotos. */
export interface ClassifierInput {
  /** Lokale Bild-URI/-Pfad (Pre-Processing übernimmt die Engine intern). */
  imageUri: string;
}

/** Ergebnis einer Klassifikation. */
export interface ClassificationResult {
  /** Erkanntes Label (Klartext). */
  label: string;
  /** Konfidenz 0..1 (Wahrscheinlichkeit der Top-Klasse). */
  confidence: number;
}

/** On-Device-Klassifikator. Implementierungen kapseln Modell und Vorverarbeitung. */
export interface Classifier {
  classify(input: ClassifierInput): Promise<ClassificationResult>;
}
