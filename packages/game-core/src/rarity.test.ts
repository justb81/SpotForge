import { describe, expect, it } from "vitest";
import {
  Rarity,
  RARITY_ORDER,
  RARITY_PERCENTILE_BANDS,
  compareRarity,
  rarityFromPercentile,
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
