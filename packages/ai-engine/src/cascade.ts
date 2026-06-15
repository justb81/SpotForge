/**
 * Zwei-Stufen-**Kaskade** für die On-Device-Klassifikation: ein günstiges
 * **Gate** klärt grob „gehört das überhaupt in den Scope?" (z.B. „ist das ein
 * Fahrzeug?"), und erst bei Annahme wird das schwere **Feinmodell** (Marke+
 * Modell) ausgeführt.
 *
 * **Beide Modelle sind fest im APK gebündelt** (je Variante) – es wird nichts
 * nachgeladen. Das Feinmodell wird lediglich **bei Bedarf in den Speicher
 * initialisiert** (aus dem gebündelten Asset), nämlich erst beim ersten
 * akzeptierten Gate: So belegt das große Modell Speicher/Akku nur, wenn das Gate
 * akzeptiert, und der Guardrail (Reject von Nicht-Scope-Objekten) greift **vor**
 * dem teuren Schritt.
 *
 * Kategorie-neutral: die erlaubten Gate-Labels (Allowlist) kommen von außen
 * (aus der `AppDefinition`, verdrahtet in `forgeCard` #8) – hier steht **keine**
 * fest kodierte Kategorie. Rein und ohne RN-Import → unter vitest testbar.
 */

import type {
  Classifier,
  ClassifierInput,
  ClassificationResult,
  ClassificationCandidate,
} from "./classifier";

/** Annahme-Kriterium der Gate-Stufe. */
export interface GateConfig {
  /**
   * Erlaubte Gate-Labels (z.B. Fahrzeug-Klassen eines breiten Gate-Modells).
   * Stammt aus der `AppDefinition` – nicht aus dem gemeinsamen Code.
   */
  allow: string[];
  /** Mindest-Konfidenz des besten erlaubten Kandidaten, sonst Reject. */
  minConfidence: number;
}

/** Ergebnis der Gate-Prüfung. */
export interface GateDecision {
  accepted: boolean;
  /** Bester erlaubter Kandidat (falls vorhanden), unabhängig von der Schwelle. */
  matched?: ClassificationCandidate;
}

/**
 * Prüft das Gate-Ergebnis gegen die Allowlist: akzeptiert, wenn der beste
 * erlaubte Kandidat die Mindest-Konfidenz erreicht.
 */
export function evaluateGate(result: ClassificationResult, config: GateConfig): GateDecision {
  const allow = new Set(config.allow);
  const matched = result.candidates.find((c) => allow.has(c.label));
  return { accepted: matched !== undefined && matched.confidence >= config.minConfidence, matched };
}

/** Ergebnis der Kaskade. `fine` ist nur gesetzt, wenn das Gate akzeptiert hat. */
export interface CascadeResult {
  gate: ClassificationResult;
  decision: GateDecision;
  fine?: ClassificationResult;
}

export interface CascadeClassifier {
  classify(input: ClassifierInput): Promise<CascadeResult>;
}

export interface CascadeOptions {
  /** Günstige Gate-Stufe (breites Modell), liefert grobe Labels. */
  gate: Classifier;
  /** Annahme-Kriterium (Allowlist + Schwelle). */
  gateConfig: GateConfig;
  /**
   * Initialisiert das **gebündelte** Feinmodell in den Speicher (kein Netz). Wird
   * **erst beim ersten akzeptierten Gate** aufgerufen und danach gecached (auch
   * parallele Aufrufe teilen die Promise).
   */
  initFine: () => Promise<Classifier>;
}

/**
 * Baut eine {@link CascadeClassifier} aus Gate + Feinmodell. Das (gebündelte)
 * Feinmodell wird nur in den Speicher initialisiert, wenn das Gate mindestens
 * einmal akzeptiert – ein Reject lässt es uninitialisiert.
 */
export function createCascadeClassifier({
  gate,
  gateConfig,
  initFine,
}: CascadeOptions): CascadeClassifier {
  let finePromise: Promise<Classifier> | undefined;
  const ensureFine = () => (finePromise ??= initFine());

  return {
    async classify(input: ClassifierInput): Promise<CascadeResult> {
      const gateResult = await gate.classify(input);
      const decision = evaluateGate(gateResult, gateConfig);
      if (!decision.accepted) {
        return { gate: gateResult, decision };
      }
      const fine = await ensureFine();
      return { gate: gateResult, decision, fine: await fine.classify(input) };
    },
  };
}
