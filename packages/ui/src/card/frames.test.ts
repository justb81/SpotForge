import { describe, expect, it } from "vitest";
import { Rarity } from "@spotforge/game-core";
import { mergeCardFrames, type ResolvedCardFrames } from "./frames";

// Asset-Quellen sind zur Laufzeit Asset-IDs (number); für den reinen Merge-Test
// genügen Marker-Zahlen.
const defaults: ResolvedCardFrames = {
  [Rarity.Common]: 1,
  [Rarity.Uncommon]: 2,
  [Rarity.Rare]: 3,
  [Rarity.Epic]: 4,
  [Rarity.Legendary]: 5,
};

describe("mergeCardFrames", () => {
  it("liefert ohne Overrides eine vollständige Kopie der Defaults", () => {
    const result = mergeCardFrames(defaults);
    expect(result).toEqual(defaults);
    expect(result).not.toBe(defaults);
  });

  it("überschreibt nur die angegebenen Stufen", () => {
    const result = mergeCardFrames(defaults, { [Rarity.Legendary]: 99 });
    expect(result[Rarity.Legendary]).toBe(99);
    expect(result[Rarity.Common]).toBe(1);
  });

  it("garantiert immer eine vollständige Map (alle Stufen gebunden)", () => {
    const result = mergeCardFrames(defaults, { [Rarity.Rare]: 42 });
    for (const rarity of Object.values(Rarity)) {
      expect(result[rarity]).toBeDefined();
    }
  });
});
