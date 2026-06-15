import { describe, expect, it } from "vitest";
import { compareRarity, computeRarity } from "./rarity";
import { spottingDensity } from "./spotting-density";

const config = { refineThreshold: 20 }; // k = 20 (Default)

describe("spottingDensity (ADR 0009 — adaptives Raster)", () => {
  it("bleibt bei dünner Datenlage grob (Cold-Start): nutzt den groben Zähler", () => {
    // Region (0 Stellen) hat nur 2 ähnliche → kein Drill-down → 2/(2+20).
    expect(spottingDensity([2, 1, 0], config)).toBeCloseTo(2 / 22);
  });

  it("drillt bei dichter Lage bis zur feinsten Stufe (Museum/Händlerhof-Farming)", () => {
    // Region 60 > 20 → Stadt 55 > 20 → Stadtteil 50 (feinste) → 50/(50+20).
    expect(spottingDensity([60, 55, 50], config)).toBeCloseTo(50 / 70);
  });

  it("citywide häufig, lokal dünn → niedrige Dichte (lokal selten)", () => {
    // Region/Stadt voll, aber der konkrete Stadtteil hat nur 1 → 1/(1+20).
    expect(spottingDensity([200, 200, 1], config)).toBeCloseTo(1 / 21);
  });

  it("Schwelle ist strikt (count == N drillt nicht weiter)", () => {
    // Stufe 0 hat genau 20 (nicht > 20) → bleibt grob → 20/(20+20) = 0,5.
    expect(spottingDensity([20, 5, 0], config)).toBeCloseTo(0.5);
  });

  it("erste Sichtung überhaupt → Dichte 0", () => {
    expect(spottingDensity([0, 0, 0], config)).toBe(0);
    expect(spottingDensity([], config)).toBe(0);
  });

  it("klemmt negative/nicht-endliche Zähler defensiv", () => {
    expect(spottingDensity([-5, NaN], config)).toBe(0);
  });

  it("steigende lokale Dichte senkt die resultierende Seltenheit (Anti-Farming)", () => {
    const realWorldRarity = 0.95;
    const sparse = computeRarity({
      realWorldRarity,
      appSpottingFrequency: spottingDensity([1, 0, 0], config),
    });
    const farmed = computeRarity({
      realWorldRarity,
      appSpottingFrequency: spottingDensity([200, 120, 80], config),
    });
    expect(compareRarity(farmed, sparse)).toBeLessThan(0);
  });
});
