import { describe, expect, it, vi } from "vitest";
import type { Classifier, ClassificationResult } from "./classifier";
import {
  createCascadeClassifier,
  evaluateGate,
  formatCascadeTimings,
  type GateConfig,
} from "./cascade";

const gateCfg: GateConfig = {
  allow: ["sports car", "convertible", "car wheel", "pickup"],
  minConfidence: 0.5,
};

function result(candidates: [string, number][]): ClassificationResult {
  const cs = candidates.map(([label, confidence]) => ({ label, confidence }));
  return { label: cs[0]?.label ?? "", confidence: cs[0]?.confidence ?? 0, candidates: cs };
}

function fixedClassifier(r: ClassificationResult): Classifier {
  return { classify: vi.fn(async () => r) };
}

describe("evaluateGate (summierte Klassen-Masse, #83)", () => {
  it("akzeptiert, wenn ein einzelnes erlaubtes Label die Schwelle erreicht", () => {
    const d = evaluateGate(result([["sports car", 0.8]]), gateCfg);
    expect(d.accepted).toBe(true);
    expect(d.mass).toBeCloseTo(0.8);
    expect(d.matched?.label).toBe("sports car");
  });

  it("akzeptiert über die SUMME verteilter Masse, die einzeln unter der Schwelle läge", () => {
    // Kern von #83: ein Auto verteilt seine Masse über mehrere Synsets – jedes
    // für sich (0,30 / 0,22 / 0,18) unter 0,5, summiert (0,70) klar im Scope.
    const d = evaluateGate(
      result([
        ["sports car", 0.3],
        ["convertible", 0.22],
        ["car wheel", 0.18],
      ]),
      gateCfg,
    );
    expect(d.accepted).toBe(true);
    expect(d.mass).toBeCloseTo(0.7);
    expect(d.matched?.label).toBe("sports car"); // bester erlaubter Kandidat
  });

  it("ignoriert nicht-erlaubte Masse und summiert nur erlaubte Kandidaten", () => {
    const d = evaluateGate(
      result([
        ["tabby cat", 0.9],
        ["sports car", 0.3],
        ["convertible", 0.25],
      ]),
      gateCfg,
    );
    expect(d.accepted).toBe(true);
    expect(d.mass).toBeCloseTo(0.55);
    expect(d.matched?.label).toBe("sports car");
  });

  it("lehnt ab, wenn die summierte erlaubte Masse unter der Schwelle bleibt", () => {
    const d = evaluateGate(
      result([
        ["pickup", 0.2],
        ["car wheel", 0.15],
      ]),
      gateCfg,
    );
    expect(d.accepted).toBe(false);
    expect(d.mass).toBeCloseTo(0.35);
    expect(d.matched?.label).toBe("pickup");
  });

  it("lehnt ab und liefert Masse 0, wenn kein Label erlaubt ist", () => {
    const d = evaluateGate(result([["tabby cat", 0.99]]), gateCfg);
    expect(d.accepted).toBe(false);
    expect(d.mass).toBe(0);
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

// Injizierte, monoton steigende Uhr: liefert die Werte der Reihe nach (für die
// letzte fällt sie auf den letzten Wert zurück) → deterministische Latenzen.
function clock(values: number[]): () => number {
  let i = 0;
  return () => values[i++] ?? values[values.length - 1] ?? 0;
}

describe("Kaskaden-Latenzen (CascadeTimings, #63)", () => {
  it("misst im Reject-Pfad nur das Gate (kein Fein-Anteil)", async () => {
    // now() wird genau 2× gerufen: t0 (vor Gate), t1 (nach Gate).
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["tabby cat", 0.99]])),
      gateConfig: gateCfg,
      initFine: vi.fn(async () => fixedClassifier(result([["x", 1]]))),
      now: clock([0, 7]),
    });

    const out = await cascade.classify({ imageUri: "img" });
    expect(out.timings).toEqual({ gateMs: 7, totalMs: 7 });
  });

  it("weist beim ERSTEN Accept Gate-, Fein-Init- und Fein-Dauer getrennt aus", async () => {
    // now()-Aufrufe: t0=0 (vor Gate), t1=10 (nach Gate), t2=25 (nach Fein-Init),
    // t3=40 (nach Fein-Classify).
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["sports car", 0.8]])),
      gateConfig: gateCfg,
      initFine: vi.fn(async () => fixedClassifier(result([["VW Golf VII", 0.7]]))),
      now: clock([0, 10, 25, 40]),
    });

    const out = await cascade.classify({ imageUri: "img" });
    expect(out.timings).toEqual({ gateMs: 10, fineInitMs: 15, fineMs: 15, totalMs: 40 });
  });

  it("zählt den Fein-Init-Kaltstart nur einmal (warmer Accept hat kein fineInitMs)", async () => {
    const cascade = createCascadeClassifier({
      gate: fixedClassifier(result([["pickup", 0.9]])),
      gateConfig: gateCfg,
      initFine: vi.fn(async () => fixedClassifier(result([["x", 1]]))),
      // 1. classify (kalt): 0,5,8,12 · 2. classify (warm): 100,105,108,112
      now: clock([0, 5, 8, 12, 100, 105, 108, 112]),
    });

    await cascade.classify({ imageUri: "a" }); // kalt → initialisiert das Feinmodell
    const warm = await cascade.classify({ imageUri: "b" }); // warm → gecached
    expect(warm.timings.fineInitMs).toBeUndefined();
    expect(warm.timings).toEqual({ gateMs: 5, fineMs: 4, totalMs: 12 });
  });
});

describe("formatCascadeTimings", () => {
  it("formatiert den Reject-Pfad ohne Fein-Anteil", () => {
    expect(formatCascadeTimings({ gateMs: 142, totalMs: 142 })).toBe("Gate 142 ms · Σ 142 ms");
  });

  it("formatiert den warmen Accept-Pfad mit Fein-Anteil", () => {
    expect(formatCascadeTimings({ gateMs: 142, fineMs: 88, totalMs: 230 })).toBe(
      "Gate 142 ms · Fein 88 ms · Σ 230 ms",
    );
  });

  it("rundet und hängt den Fein-Init-Kaltstart als Zusatz an", () => {
    expect(
      formatCascadeTimings({ gateMs: 142.4, fineMs: 88, fineInitMs: 410.6, totalMs: 230 }),
    ).toBe("Gate 142 ms · Fein 88 ms · Σ 230 ms (+Init 411 ms)");
  });
});
