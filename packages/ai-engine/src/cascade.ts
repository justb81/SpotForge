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

/**
 * Stufenweise Laufzeiten der Kaskade in **Millisekunden** (Geräte-Verifikation
 * #63). Die Agent-Umgebung kann nicht auf einem echten Gerät messen, und ein
 * Standalone-Release hat kein Profiler-Overlay – daher misst die Kaskade selbst
 * und der PoC-Screen zeigt die Werte **auf dem Bildschirm** an (vgl. die
 * Error-Boundary-Lektion in CLAUDE.md). So lassen sich der **Reject-Pfad**
 * (Gate-only) und der **Accept-Pfad** (Gate→Fein) getrennt gegen das Budget
 * prüfen.
 */
export interface CascadeTimings {
  /** Dauer der Gate-Klassifikation – läuft bei **jedem** Spot (Reject-Pfad-Budget). */
  gateMs: number;
  /**
   * Einmalige Initialisierung des Feinmodells in den Speicher – nur beim
   * **ersten** akzeptierten Gate gesetzt (danach gecached). Separat ausgewiesen,
   * weil dieser Kaltstart den Steady-State-Accept-Pfad nicht belastet und nicht
   * gegen das Pro-Spot-Budget zählen sollte.
   */
  fineInitMs?: number;
  /** Dauer der Feinmodell-Klassifikation – nur im **Accept-Pfad** gesetzt. */
  fineMs?: number;
  /** Gesamtdauer von `classify()` (Gate + ggf. Fein-Init + Fein). */
  totalMs: number;
}

/** Ergebnis der Kaskade. `fine` ist nur gesetzt, wenn das Gate akzeptiert hat. */
export interface CascadeResult {
  gate: ClassificationResult;
  decision: GateDecision;
  fine?: ClassificationResult;
  /** Gemessene Stufen-Latenzen (#63) – immer gesetzt, auch im Reject-Pfad. */
  timings: CascadeTimings;
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
  /**
   * Monotone Uhr in Millisekunden für die {@link CascadeTimings} (#63);
   * injizierbar für deterministische Tests. Default: `performance.now()` (falls
   * vorhanden, monoton), sonst `Date.now()`.
   */
  now?: () => number;
}

/** Default-Zeitquelle: monotone `performance.now()`, mit `Date.now()`-Fallback. */
const monotonicNow: () => number = (() => {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === "function" ? perf.now.bind(perf) : () => Date.now();
})();

/**
 * Baut eine {@link CascadeClassifier} aus Gate + Feinmodell. Das (gebündelte)
 * Feinmodell wird nur in den Speicher initialisiert, wenn das Gate mindestens
 * einmal akzeptiert – ein Reject lässt es uninitialisiert.
 */
export function createCascadeClassifier({
  gate,
  gateConfig,
  initFine,
  now = monotonicNow,
}: CascadeOptions): CascadeClassifier {
  let finePromise: Promise<Classifier> | undefined;
  const ensureFine = () => (finePromise ??= initFine());

  return {
    async classify(input: ClassifierInput): Promise<CascadeResult> {
      const t0 = now();
      const gateResult = await gate.classify(input);
      const t1 = now();
      const decision = evaluateGate(gateResult, gateConfig);
      if (!decision.accepted) {
        // Reject-Pfad: nur das Gate lief – das Feinmodell bleibt uninitialisiert.
        return { gate: gateResult, decision, timings: { gateMs: t1 - t0, totalMs: t1 - t0 } };
      }
      // Kaltstart nur, wenn dieser Aufruf das (lazy gecachte) Feinmodell anstößt.
      const coldInit = finePromise === undefined;
      const fineClassifier = await ensureFine();
      const t2 = now();
      const fine = await fineClassifier.classify(input);
      const t3 = now();
      return {
        gate: gateResult,
        decision,
        fine,
        timings: {
          gateMs: t1 - t0,
          ...(coldInit ? { fineInitMs: t2 - t1 } : {}),
          fineMs: t3 - t2,
          totalMs: t3 - t0,
        },
      };
    },
  };
}

/**
 * Formatiert {@link CascadeTimings} zu einer kompakten, sprachneutralen Zeile für
 * die On-Screen-Anzeige der Geräte-Verifikation (#63), z.B.
 * `Gate 142 ms · Fein 88 ms · Σ 230 ms (+Init 410 ms)`. Im Reject-Pfad entfällt
 * der Fein-Anteil: `Gate 142 ms · Σ 142 ms`.
 */
export function formatCascadeTimings(t: CascadeTimings): string {
  const ms = (n: number) => `${Math.round(n)} ms`;
  const parts = [`Gate ${ms(t.gateMs)}`];
  if (t.fineMs !== undefined) parts.push(`Fein ${ms(t.fineMs)}`);
  let line = `${parts.join(" · ")} · Σ ${ms(t.totalMs)}`;
  if (t.fineInitMs !== undefined) line += ` (+Init ${ms(t.fineInitMs)})`;
  return line;
}
