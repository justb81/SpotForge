/**
 * Klassifikations-Verträge der On-Device-Engine.
 *
 * Bewusst entkoppelt von den game-core-Domänentypen (#2): der Classifier liefert
 * Roh-Kandidaten (Label + Konfidenz). Das Mapping auf Kategorie/Unterkategorie/
 * Objekt-ID und die Guardrail-Durchsetzung gehören in die `forgeCard`-
 * Orchestrierung (#8), nicht in den Classifier.
 */

/** Eingabe für die Klassifikation: die lokale URI eines aufgenommenen Fotos. */
export interface ClassifierInput {
  /** Lokale Bild-URI/-Pfad (Pre-Processing übernimmt die Engine intern). */
  imageUri: string;
}

/** Ein einzelner Klassifikations-Kandidat. */
export interface ClassificationCandidate {
  /** Erkanntes Label (Klartext, in der Reihenfolge der Modell-Labels). */
  label: string;
  /** Konfidenz 0..1 (Softmax-Wahrscheinlichkeit der Klasse). */
  confidence: number;
}

/**
 * Ergebnis einer Klassifikation: die Top-Klasse plus die Top-k-Kandidaten
 * (absteigend sortiert). `label`/`confidence` spiegeln stets `candidates[0]`
 * und erlauben einfache Top-1-Anzeige; `candidates` dient der Disambiguierung
 * (z.B. „VW Golf VII" vs. „VW Golf VI") und besseren UX.
 */
export interface ClassificationResult {
  /** Top-1-Label (= `candidates[0].label`). */
  label: string;
  /** Top-1-Konfidenz 0..1 (= `candidates[0].confidence`). */
  confidence: number;
  /** Top-k-Kandidaten, absteigend nach Konfidenz. Enthält mindestens die Top-1. */
  candidates: ClassificationCandidate[];
}

/** On-Device-Klassifikator. Implementierungen kapseln Modell und Vorverarbeitung. */
export interface Classifier {
  classify(input: ClassifierInput): Promise<ClassificationResult>;
}
