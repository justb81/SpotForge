import { describe, expect, it } from "vitest";
import {
  buildDraft,
  forgeCard,
  getAttributeValue,
  isFoil,
  PLACEHOLDER_RARITY,
  type Card,
} from "./card";
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
    status: "forged",
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

describe("buildDraft", () => {
  it("erzeugt eine draft-Karte mit Platzhalter-Rarity und leeren Attributen", () => {
    const draft = buildDraft({
      id: "draft-1",
      categoryId: "vehicles",
      objectName: "VW Golf VII",
      spottedBy: "user-42",
      createdAt: "2026-06-15T08:00:00.000Z",
      photoUri: "file:///tmp/golf.jpg",
    });
    expect(draft.status).toBe("draft");
    expect(draft.rarity).toBe(PLACEHOLDER_RARITY);
    expect(draft.attributes).toEqual({});
    expect(draft.level).toBe(1);
    expect(draft.photoUri).toBe("file:///tmp/golf.jpg");
  });

  it("übernimmt vorgeschlagene Attribute und lässt Optionales weg, wenn nicht gesetzt", () => {
    const draft = buildDraft({
      id: "draft-2",
      categoryId: "vehicles",
      objectName: "Unbekannt",
      spottedBy: "user-1",
      createdAt: "2026-06-15T08:00:00.000Z",
      proposedAttributes: { power: 110 },
    });
    expect(draft.proposedAttributes).toEqual({ power: 110 });
    expect(draft.photoUri).toBeUndefined();
    expect(draft.geoRegion).toBeUndefined();
  });
});

describe("forgeCard", () => {
  function makeDraft(): Card {
    return buildDraft({
      id: "draft-1",
      categoryId: "vehicles",
      objectName: "VW Golf VII",
      spottedBy: "user-42",
      createdAt: "2026-06-15T08:00:00.000Z",
      photoUri: "file:///tmp/golf.jpg",
      geoRegion: "70173",
      proposedAttributes: { power: 100 },
    });
  }

  it("finalisiert einen Draft mit autoritativen Attributen und Seltenheit", () => {
    const forged = forgeCard(makeDraft(), {
      attributes: { power: 110, topSpeed: 200 },
      rarity: Rarity.Rare,
    });
    expect(forged.status).toBe("forged");
    expect(forged.attributes).toEqual({ power: 110, topSpeed: 200 });
    expect(forged.rarity).toBe(Rarity.Rare);
  });

  it("übernimmt Identitäts-/Herkunftsfelder unverändert vom Draft", () => {
    const draft = makeDraft();
    const forged = forgeCard(draft, { attributes: { power: 110 }, rarity: Rarity.Common });
    expect(forged.id).toBe(draft.id);
    expect(forged.categoryId).toBe(draft.categoryId);
    expect(forged.objectName).toBe(draft.objectName);
    expect(forged.spottedBy).toBe(draft.spottedBy);
    expect(forged.createdAt).toBe(draft.createdAt);
    expect(forged.geoRegion).toBe("70173");
    expect(forged.photoUri).toBe("file:///tmp/golf.jpg");
    expect(forged.level).toBe(1);
  });

  it("verwirft die provisorischen Draft-Vorschläge", () => {
    const forged = forgeCard(makeDraft(), { attributes: { power: 110 }, rarity: Rarity.Common });
    expect(forged.proposedAttributes).toBeUndefined();
  });

  it("übernimmt Fähigkeiten und Card-Art, wenn angegeben", () => {
    const forged = forgeCard(makeDraft(), {
      attributes: { power: 110 },
      rarity: Rarity.Epic,
      abilities: [{ kind: "turbo" }],
      artUri: "file:///tmp/art.png",
    });
    expect(forged.abilities).toEqual([{ kind: "turbo" }]);
    expect(forged.artUri).toBe("file:///tmp/art.png");
  });

  it("lässt einen bereits geforgten Draft nicht erneut forgen (Übergang ist einmalig)", () => {
    const forged = forgeCard(makeDraft(), { attributes: { power: 110 }, rarity: Rarity.Common });
    expect(() => forgeCard(forged, { attributes: { power: 120 }, rarity: Rarity.Rare })).toThrow();
  });

  it("lehnt ein leeres Attribut-Set ab (forged ist vollständig)", () => {
    expect(() => forgeCard(makeDraft(), { attributes: {}, rarity: Rarity.Common })).toThrow();
  });

  it("ist rein – mutiert den Eingangs-Draft nicht", () => {
    const draft = makeDraft();
    forgeCard(draft, { attributes: { power: 110 }, rarity: Rarity.Rare });
    expect(draft.status).toBe("draft");
    expect(draft.rarity).toBe(PLACEHOLDER_RARITY);
    expect(draft.attributes).toEqual({});
  });
});
