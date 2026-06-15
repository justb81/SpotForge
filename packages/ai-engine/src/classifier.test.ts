import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  Classifier,
  ClassifierInput,
  ClassificationCandidate,
  ClassificationResult,
} from "./classifier";
import { selectTopK } from "./select-top-k";

/**
 * **Festgeschriebener Classifier-Vertrag** – die stabile, von der `forgeCard`-
 * Orchestrierung (#8) konsumierte Schnittstelle. Dieser Test friert sowohl die
 * **Typ-Form** (Regressions-Guard) als auch die dokumentierten **Laufzeit-
 * Invarianten** ein.
 *
 * Wichtig: Die `expectTypeOf`-Pins greifen **beim `typecheck`-Task** (`tsc`
 * prüft `src/*.test.ts`) – ein abweichender Vertrag bricht dann den Build.
 * `vitest run` selbst transpiliert nur und führt die Laufzeit-`expect`s aus.
 */
describe("Classifier-Vertrag: Typ-Form (von #8 konsumiert)", () => {
  it("friert ClassifierInput / ClassificationResult / ClassificationCandidate ein", () => {
    expectTypeOf<ClassifierInput>().toEqualTypeOf<{ imageUri: string }>();
    expectTypeOf<ClassificationCandidate>().toEqualTypeOf<{ label: string; confidence: number }>();
    expectTypeOf<ClassificationResult>().toEqualTypeOf<{
      label: string;
      confidence: number;
      candidates: ClassificationCandidate[];
    }>();
  });

  it("friert die Classifier-Methode ein (Eingabe → Promise<ClassificationResult>)", () => {
    expectTypeOf<Classifier["classify"]>().parameters.toEqualTypeOf<[ClassifierInput]>();
    expectTypeOf<Classifier["classify"]>().returns.resolves.toEqualTypeOf<ClassificationResult>();
  });

  it("ist domänenfrei: exakt diese Schlüssel, keine game-core-/AppDefinition-Felder", () => {
    // Würde der Vertrag um ein Domänenfeld (z.B. `objectId`/`category`) erweitert,
    // bräche dieser Pin – das Mapping auf Domänentypen gehört bewusst in #8.
    expectTypeOf<keyof ClassificationResult>().toEqualTypeOf<
      "label" | "confidence" | "candidates"
    >();
    expectTypeOf<keyof ClassificationCandidate>().toEqualTypeOf<"label" | "confidence">();
  });
});

/** Kanonischer Produzent eines {@link ClassificationResult} für die Invarianten. */
function makeClassifier(scores: Record<string, number>, topK?: number): Classifier {
  return { classify: async () => selectTopK(scores, topK) };
}

describe("Classifier-Vertrag: Laufzeit-Invarianten (von #8 vorausgesetzt)", () => {
  it("liefert mindestens einen Kandidaten", async () => {
    const r = await makeClassifier({ "VW Golf VII 2013": 0.91 }).classify({ imageUri: "img" });
    expect(r.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it("spiegelt label/confidence stets in candidates[0]", async () => {
    const r = await makeClassifier({
      "VW Golf VII 2013": 0.7,
      "VW Golf VI 2010": 0.2,
    }).classify({ imageUri: "img" });
    expect(r.label).toBe(r.candidates[0]?.label);
    expect(r.confidence).toBe(r.candidates[0]?.confidence);
  });

  it("sortiert candidates absteigend nach confidence", async () => {
    const r = await makeClassifier({ a: 0.1, b: 0.9, c: 0.5 }).classify({ imageUri: "img" });
    const confidences = r.candidates.map((c) => c.confidence);
    expect(confidences).toEqual([...confidences].sort((x, y) => y - x));
  });
});
