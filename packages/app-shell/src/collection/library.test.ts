import { describe, expect, it } from "vitest";
import { Rarity, type Card, type CardStatus } from "@spotforge/game-core";
import { filterCards, queryLibrary, sortCards } from "./library";

function card(overrides: Partial<Card> & Pick<Card, "id">): Card {
  return {
    categoryId: "vehicles",
    objectName: "Object",
    attributes: {},
    rarity: Rarity.Common,
    abilities: [],
    level: 1,
    spottedBy: "tester",
    createdAt: "2026-06-20T10:00:00.000Z",
    status: "draft" as CardStatus,
    ...overrides,
  };
}

const golf = card({
  id: "1",
  objectName: "VW Golf",
  rarity: Rarity.Common,
  createdAt: "2026-06-18T10:00:00.000Z",
});
const bugatti = card({
  id: "2",
  objectName: "Bugatti Veyron",
  rarity: Rarity.Legendary,
  status: "forged",
  createdAt: "2026-06-19T10:00:00.000Z",
});
const tesla = card({
  id: "3",
  objectName: "Tesla Model 3",
  rarity: Rarity.Rare,
  createdAt: "2026-06-20T10:00:00.000Z",
});
const cards = [golf, bugatti, tesla];

describe("filterCards", () => {
  it("ohne Filter alle Karten", () => {
    expect(filterCards(cards)).toHaveLength(3);
  });

  it("filtert per Freitextsuche (case-insensitiv, Teilstring)", () => {
    expect(filterCards(cards, { search: "vw" }).map((c) => c.id)).toEqual(["1"]);
    expect(filterCards(cards, { search: "  MODEL " }).map((c) => c.id)).toEqual(["3"]);
    expect(filterCards(cards, { search: "" })).toHaveLength(3);
  });

  it("filtert nach Seltenheit und Status", () => {
    expect(filterCards(cards, { rarity: Rarity.Legendary }).map((c) => c.id)).toEqual(["2"]);
    expect(filterCards(cards, { status: "forged" }).map((c) => c.id)).toEqual(["2"]);
    expect(filterCards(cards, { status: "draft" }).map((c) => c.id)).toEqual(["1", "3"]);
  });

  it("kombiniert Kriterien (UND)", () => {
    expect(filterCards(cards, { status: "draft", rarity: Rarity.Rare }).map((c) => c.id)).toEqual([
      "3",
    ]);
  });
});

describe("sortCards", () => {
  it("newest = neueste zuerst, oldest umgekehrt", () => {
    expect(sortCards(cards, "newest").map((c) => c.id)).toEqual(["3", "2", "1"]);
    expect(sortCards(cards, "oldest").map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("name alphabetisch", () => {
    expect(sortCards(cards, "name").map((c) => c.objectName)).toEqual([
      "Bugatti Veyron",
      "Tesla Model 3",
      "VW Golf",
    ]);
  });

  it("rarity = seltenste zuerst", () => {
    expect(sortCards(cards, "rarity").map((c) => c.id)).toEqual(["2", "3", "1"]);
  });

  it("ist deterministisch (lässt die Eingabe unverändert)", () => {
    const input = [...cards];
    sortCards(input, "rarity");
    expect(input).toEqual(cards);
  });
});

describe("queryLibrary", () => {
  it("filtert und sortiert zusammen", () => {
    const result = queryLibrary(cards, { filter: { status: "draft" }, sort: "name" });
    expect(result.map((c) => c.id)).toEqual(["3", "1"]);
  });

  it("default: kein Filter, newest", () => {
    expect(queryLibrary(cards).map((c) => c.id)).toEqual(["3", "2", "1"]);
  });
});
