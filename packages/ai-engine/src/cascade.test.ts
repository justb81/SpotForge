import { describe, expect, it, vi } from "vitest";
import type { Classifier, ClassificationResult } from "./classifier";
import { createCascadeClassifier, evaluateGate, type GateConfig } from "./cascade";

const gateCfg: GateConfig = { allow: ["sports car", "pickup"], minConfidence: 0.5 };

function result(candidates: [string, number][]): ClassificationResult {
  const cs = candidates.map(([label, confidence]) => ({ label, confidence }));
  return { label: cs[0]?.label ?? "", confidence: cs[0]?.confidence ?? 0, candidates: cs };
}

function fixedClassifier(r: ClassificationResult): Classifier {
  return { classify: vi.fn(async () => r) };
}

describe("evaluateGate", () => {
  it("akzeptiert erlaubtes Label über der Schwelle", () => {
    const d = evaluateGate(result([["sports car", 0.8]]), gateCfg);
    expect(d.accepted).toBe(true);
    expect(d.matched?.label).toBe("sports car");
  });

  it("lehnt erlaubtes Label unter der Schwelle ab", () => {
    const d = evaluateGate(result([["pickup", 0.3]]), gateCfg);
    expect(d.accepted).toBe(false);
    expect(d.matched?.label).toBe("pickup");
  });

  it("lehnt nicht-erlaubtes Top-Label ab, nutzt aber erlaubten Folgekandidaten", () => {
    const d = evaluateGate(
      result([
        ["tabby cat", 0.9],
        ["sports car", 0.6],
      ]),
      gateCfg,
    );
    expect(d.accepted).toBe(true);
    expect(d.matched?.label).toBe("sports car");
  });

  it("lehnt ab, wenn kein Label erlaubt ist", () => {
    const d = evaluateGate(result([["tabby cat", 0.99]]), gateCfg);
    expect(d.accepted).toBe(false);
    expect(d.matched).toBeUndefined();
  });
});

describe("createCascadeClassifier", () => {
  it("initialisiert das Feinmodell nicht, wenn das Gate ablehnt", async () => {
    const initFine = vi.fn(async () => fixedClassifier(result([["x", 1]])));
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["tabby cat", 0.99]])),
      gateConfig: gateCfg,
      initFine,
    });

    const out = await cascade.classify({ imageUri: "img" });
    expect(out.decision.accepted).toBe(false);
    expect(out.fine).toBeUndefined();
    expect(initFine).not.toHaveBeenCalled();
  });

  it("initialisiert & nutzt das Feinmodell, wenn das Gate akzeptiert", async () => {
    const fine = fixedClassifier(result([["VW Golf VII 2013", 0.7]]));
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["sports car", 0.8]])),
      gateConfig: gateCfg,
      initFine: vi.fn(async () => fine),
    });

    const out = await cascade.classify({ imageUri: "img" });
    expect(out.decision.accepted).toBe(true);
    expect(out.fine?.label).toBe("VW Golf VII 2013");
  });

  it("initialisiert das Feinmodell nur einmal (bei Bedarf, gecached)", async () => {
    const initFine = vi.fn(async () => fixedClassifier(result([["x", 1]])));
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["pickup", 0.9]])),
      gateConfig: gateCfg,
      initFine,
    });

    await cascade.classify({ imageUri: "a" });
    await cascade.classify({ imageUri: "b" });
    expect(initFine).toHaveBeenCalledTimes(1);
  });
});
