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

/**
 * Empfohlenes `topK` der **Gate**-Stufe (#83). Bewusst hoch, weil ein Objekt im
 * Scope seine Wahrscheinlichkeitsmasse oft über mehrere erlaubte Synsets
 * verteilt (ein Auto: `sports car` 0,30 + `convertible` 0,22 + `car wheel` 0,18
 * …) – jede Klasse für sich unter der Schwelle, summiert klar im Scope.
 * {@link evaluateGate} schwellt diese **summierte** Masse; ein zu kleines `topK`
 * würde verteilte Masse abschneiden und legitime Spots fälschlich ablehnen
 * (False-Negative). Der App-Host baut die Gate-{@link Classifier}-Instanz mit
 * diesem Wert; das Feinmodell bleibt bei kleinem `topK` (Top-k-UX).
 */
export const GATE_TOP_K = 20;

/** Annahme-Kriterium der Gate-Stufe. */
export interface GateConfig {
  /**
   * Erlaubte Gate-Labels (z.B. Fahrzeug-Klassen eines breiten Gate-Modells).
   * Stammt aus der `AppDefinition` – nicht aus dem gemeinsamen Code.
   */
  allow: string[];
  /**
   * Mindest-**summierte** Wahrscheinlichkeitsmasse über alle erlaubten Synsets
   * (marginale `P(im Scope)`), sonst Reject. **Nicht** die Schwelle eines
   * einzelnen Kandidaten – die Semantik ist bewusst recall-lastig (#83): die
   * Asymmetrie favorisiert sie, weil ein False-Negative einen legitimen Spot
   * killt, ein False-Positive aber billig vom Feinmodell/`unrecognized`-Pfad
   * abgefangen wird.
   */
  minConfidence: number;
}

/** Ergebnis der Gate-Prüfung. */
export interface GateDecision {
  accepted: boolean;
  /**
   * Summierte Wahrscheinlichkeit über alle erlaubten Kandidaten (marginale
   * `P(im Scope)`), gegen die {@link GateConfig.minConfidence} geprüft wird.
   */
  mass: number;
  /**
   * Bester erlaubter Kandidat (falls vorhanden), unabhängig von der Schwelle –
   * dient der Reject-/UX-Meldung („erkannt: …"), nicht der Annahme-Entscheidung.
   */
  matched?: ClassificationCandidate;
}

/**
 * Prüft das Gate-Ergebnis gegen die Allowlist über **summierte Klassen-Masse**
 * (#83): akzeptiert, wenn die Summe der Konfidenzen aller erlaubten Kandidaten
 * (marginale `P(im Scope)`) die Schwelle erreicht. Das fängt über mehrere
 * Synsets verteilte Scope-Masse ein, die ein Einzelklassen-Schwellwert verlöre
 * (häufigste Quelle von Gate-False-Negatives). `matched` (bester erlaubter
 * Kandidat) bleibt für die Reject-Meldung erhalten.
 */
export function evaluateGate(result: ClassificationResult, config: GateConfig): GateDecision {
  const allow = new Set(config.allow);
  let mass = 0;
  let matched: ClassificationCandidate | undefined;
  for (const c of result.candidates) {
    if (!allow.has(c.label)) continue;
    mass += c.confidence;
    if (matched === undefined) matched = c; // Kandidaten sind absteigend sortiert.
  }
  return { accepted: mass >= config.minConfidence, mass, matched };
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
