import { describe, expect, it } from "vitest";
import { Rarity, type Card } from "@spotforge/game-core";
import {
  MAX_LEVEL,
  clampLevel,
  collectionStats,
  nextTitleBand,
  titleForLevel,
} from "./profile";

function card(rarity: Rarity, status: Card["status"] = "draft"): Card {
  return {
    id: `${rarity}-${status}-${Math.random()}`,
    categoryId: "vehicles",
    objectName: "Object",
    attributes: {},
    rarity,
    abilities: [],
    level: 1,
    spottedBy: "tester",
    createdAt: "2026-06-20T10:00:00.000Z",
    status,
  };
}

describe("clampLevel", () => {
  it("klemmt auf [1, 100] und schneidet Nachkommastellen ab", () => {
    expect(clampLevel(0)).toBe(1);
    expect(clampLevel(150)).toBe(MAX_LEVEL);
    expect(clampLevel(12.9)).toBe(12);
    expect(clampLevel(Number.NaN)).toBe(1);
  });
});

describe("titleForLevel (GDD §7.1)", () => {
  it("ordnet Level dem höchsten erreichten Band zu", () => {
    expect(titleForLevel(1)).toBe("rookie");
    expect(titleForLevel(9)).toBe("rookie");
    expect(titleForLevel(10)).toBe("pro");
    expect(titleForLevel(25)).toBe("expert");
    expect(titleForLevel(50)).toBe("master");
    expect(titleForLevel(80)).toBe("legendary");
    expect(titleForLevel(100)).toBe("legendary");
  });

  it("nennt das nächste noch nicht erreichte Band", () => {
    expect(nextTitleBand(1)).toEqual({ title: "pro", minLevel: 10 });
    expect(nextTitleBand(50)).toEqual({ title: "legendary", minLevel: 80 });
    expect(nextTitleBand(80)).toBeUndefined();
  });
});

describe("collectionStats (GDD §7.1)", () => {
  it("zählt Gesamt/Drafts/Forged und die Seltenheits-Verteilung", () => {
    const stats = collectionStats([
      card(Rarity.Common),
      card(Rarity.Common, "forged"),
      card(Rarity.Legendary, "forged"),
    ]);
    expect(stats.total).toBe(3);
    expect(stats.drafts).toBe(1);
    expect(stats.forged).toBe(2);
    expect(stats.byRarity[Rarity.Common]).toBe(2);
    expect(stats.byRarity[Rarity.Legendary]).toBe(1);
    expect(stats.byRarity[Rarity.Rare]).toBe(0);
    // Gesamtseltenheit = (1 + 1) + 5 = 7
    expect(stats.rarityScore).toBe(7);
  });

  it("liefert für eine leere Sammlung Nullwerte mit vollständigem Rarity-Block", () => {
    const stats = collectionStats([]);
    expect(stats).toEqual({
      total: 0,
      drafts: 0,
      forged: 0,
      byRarity: {
        [Rarity.Common]: 0,
        [Rarity.Uncommon]: 0,
        [Rarity.Rare]: 0,
        [Rarity.Epic]: 0,
        [Rarity.Legendary]: 0,
      },
      rarityScore: 0,
    });
  });
});
