import { describe, expect, it } from "vitest";
import { selectTopK } from "./select-top-k";

describe("selectTopK", () => {
  it("sortiert absteigend und spiegelt die Top-1 in label/confidence", () => {
    const result = selectTopK({ b: 0.2, a: 0.7, c: 0.1 }, 5);
    expect(result.label).toBe("a");
    expect(result.confidence).toBeCloseTo(0.7);
    expect(result.candidates.map((c) => c.label)).toEqual(["a", "b", "c"]);
  });

  it("kürzt auf die Top-k", () => {
    const result = selectTopK({ a: 0.5, b: 0.3, c: 0.15, d: 0.05 }, 2);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates.map((c) => c.label)).toEqual(["a", "b"]);
  });

  it("liefert mindestens einen Kandidaten, auch bei topK < 1", () => {
    const result = selectTopK({ a: 0.9, b: 0.1 }, 0);
    expect(result.candidates).toHaveLength(1);
    expect(result.label).toBe("a");
  });

  it("ergibt ein leeres Label bei leeren Scores", () => {
    const result = selectTopK({}, 5);
    expect(result.label).toBe("");
    expect(result.confidence).toBe(0);
    expect(result.candidates).toEqual([{ label: "", confidence: 0 }]);
  });
});
