import { describe, expect, it } from "vitest";
import { getAttributeValue, isFoil, type Card } from "./card";
import { Rarity } from "./rarity";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    categoryId: "vehicles",
    objectName: "VW Golf VII",
    attributes: { power: 110, topSpeed: 200 },
    rarity: Rarity.Common,
    abilities: [],
    level: 1,
    spottedBy: "user-42",
    createdAt: "2026-06-15T08:00:00.000Z",
    ...overrides,
  };
}

describe("isFoil", () => {
  it("ist erst ab der Foil-Stufe true", () => {
    expect(isFoil(makeCard({ level: 1 }))).toBe(false);
    expect(isFoil(makeCard({ level: 2 }))).toBe(false);
    expect(isFoil(makeCard({ level: 3 }))).toBe(true);
  });
});

describe("getAttributeValue", () => {
  it("liefert vorhandene Werte", () => {
    expect(getAttributeValue(makeCard(), "power")).toBe(110);
    expect(getAttributeValue(makeCard(), "topSpeed")).toBe(200);
  });

  it("liefert undefined für unbekannte Schlüssel", () => {
    expect(getAttributeValue(makeCard(), "weight")).toBeUndefined();
  });
});
