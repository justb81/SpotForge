import { describe, expect, it } from "vitest";
import {
  Rarity,
  RARITY_ORDER,
  RARITY_PERCENTILE_BANDS,
  compareRarity,
  computeRarity,
  rarityFromPercentile,
  rarityPercentile,
  rarityRank,
} from "./rarity";

describe("Rarity", () => {
  it("nutzt kleingeschriebene Werte (kompatibel zu app-config cardFrames)", () => {
    expect(Rarity.Common).toBe("common");
    expect(Rarity.Uncommon).toBe("uncommon");
    expect(Rarity.Rare).toBe("rare");
    expect(Rarity.Epic).toBe("epic");
    expect(Rarity.Legendary).toBe("legendary");
  });
});

describe("rarityRank / compareRarity", () => {
  it("rangiert von häufig (0) nach selten", () => {
    expect(rarityRank(Rarity.Common)).toBe(0);
    expect(rarityRank(Rarity.Legendary)).toBe(RARITY_ORDER.length - 1);
  });

  it("ordnet aufsteigend Common < Uncommon < Rare < Epic < Legendary", () => {
    const shuffled = [Rarity.Epic, Rarity.Common, Rarity.Legendary, Rarity.Rare, Rarity.Uncommon];
    expect([...shuffled].sort(compareRarity)).toEqual([...RARITY_ORDER]);
    expect(compareRarity(Rarity.Common, Rarity.Legendary)).toBeLessThan(0);
    expect(compareRarity(Rarity.Epic, Rarity.Rare)).toBeGreaterThan(0);
    expect(compareRarity(Rarity.Rare, Rarity.Rare)).toBe(0);
  });
});

describe("rarityFromPercentile (GDD §5.3)", () => {
  it("bildet die Perzentil-Bänder ab", () => {
    expect(rarityFromPercentile(0)).toBe(Rarity.Common);
    expect(rarityFromPercentile(0.59)).toBe(Rarity.Common);
    expect(rarityFromPercentile(0.6)).toBe(Rarity.Uncommon);
    expect(rarityFromPercentile(0.79)).toBe(Rarity.Uncommon);
    expect(rarityFromPercentile(0.8)).toBe(Rarity.Rare);
    expect(rarityFromPercentile(0.94)).toBe(Rarity.Rare);
    expect(rarityFromPercentile(0.95)).toBe(Rarity.Epic);
    expect(rarityFromPercentile(0.98)).toBe(Rarity.Epic);
    expect(rarityFromPercentile(0.99)).toBe(Rarity.Legendary);
    expect(rarityFromPercentile(1)).toBe(Rarity.Legendary);
  });

  it("klemmt Werte außerhalb von [0,1]", () => {
    expect(rarityFromPercentile(-5)).toBe(Rarity.Common);
    expect(rarityFromPercentile(42)).toBe(Rarity.Legendary);
  });
});

describe("RARITY_PERCENTILE_BANDS", () => {
  it("folgt der kanonischen Reihenfolge mit aufsteigenden Grenzen", () => {
    expect(RARITY_PERCENTILE_BANDS.map((band) => band.rarity)).toEqual([...RARITY_ORDER]);
    const mins = RARITY_PERCENTILE_BANDS.map((band) => band.minPercentile);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });
});

describe("rarityPercentile (GDD §5.3)", () => {
  it("multipliziert Realwelt-Seltenheit mit In-App-Knappheit (1 − lokale Dichte)", () => {
    expect(rarityPercentile({ realWorldRarity: 0.9, appSpottingFrequency: 0 })).toBeCloseTo(0.9);
    expect(rarityPercentile({ realWorldRarity: 0.8, appSpottingFrequency: 0.5 })).toBeCloseTo(0.4);
  });

  it("dichte In-App-Standorte sinken zum Common-Band, selbst bei hoher Realwelt-Seltenheit", () => {
    expect(rarityPercentile({ realWorldRarity: 1, appSpottingFrequency: 1 })).toBe(0);
  });

  it("klemmt nicht-endliche und out-of-range-Eingaben", () => {
    expect(rarityPercentile({ realWorldRarity: NaN, appSpottingFrequency: 0 })).toBe(0);
    expect(rarityPercentile({ realWorldRarity: 5, appSpottingFrequency: -3 })).toBe(1);
  });
});

describe("computeRarity (GDD §5.3)", () => {
  it("bildet die GDD-Beispiele ab", () => {
    // VW Golf: häufig in der Realwelt und dicht geforgt → Common.
    expect(computeRarity({ realWorldRarity: 0.1, appSpottingFrequency: 0.9 })).toBe(Rarity.Common);
    // Ferrari LaFerrari: selten in der Realwelt, kaum geforgt → Rare.
    expect(computeRarity({ realWorldRarity: 0.9, appSpottingFrequency: 0.05 })).toBe(Rarity.Rare);
    // Bugatti Veyron: extrem selten, fast nie geforgt → Epic.
    expect(computeRarity({ realWorldRarity: 0.98, appSpottingFrequency: 0.02 })).toBe(Rarity.Epic);
  });

  it("erlaubt manuell kuratierte Legendaries und übergeht die Berechnung", () => {
    // Prototyp-Rennwagen: per Kuratierung Legendary, trotz Common-Faktoren.
    expect(
      computeRarity({
        realWorldRarity: 0.1,
        appSpottingFrequency: 0.9,
        curatedRarity: Rarity.Legendary,
      }),
    ).toBe(Rarity.Legendary);
  });

  it("ist deterministisch (gleiche Eingabe → gleiche Stufe)", () => {
    const input = { realWorldRarity: 0.7, appSpottingFrequency: 0.3 };
    expect(computeRarity(input)).toBe(computeRarity(input));
  });

  it("steigende lokale Dichte senkt die Seltenheit (Forge-Reihenfolge am selben Ort)", () => {
    // Gleiches Objekt, immer dichter geforgt → spätere Karten werden häufiger.
    const realWorldRarity = 0.95;
    const first = computeRarity({ realWorldRarity, appSpottingFrequency: 0.02 });
    const later = computeRarity({ realWorldRarity, appSpottingFrequency: 0.95 });
    expect(compareRarity(later, first)).toBeLessThan(0);
  });
});
