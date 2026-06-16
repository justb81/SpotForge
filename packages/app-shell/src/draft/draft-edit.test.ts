import { describe, expect, it } from "vitest";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { buildDraft, forgeCard, Rarity } from "@spotforge/game-core";
import {
  applyDraftEdits,
  collectProposedAttributes,
  draftAttributeInputs,
  draftPreviewCard,
  parseAttributeInput,
} from "./draft-edit";

// Minimal-Schema (zwei Attribute) – Tests prüfen die reine Logik, nicht das
// Fahrzeug-Schema; die Quelle der Wahrheit bleibt data/categories.
const DEFS: AttributeDefinition[] = [
  { key: "power", label: "PS", unit: "PS", trumpfable: true, higherIsBetter: true },
  { key: "weight", label: "Gewicht", unit: "kg", trumpfable: true, higherIsBetter: false },
];

function draft(): Card {
  return buildDraft({
    id: "d1",
    categoryId: "vehicles",
    objectName: "sports car",
    spottedBy: "tester",
    createdAt: "2026-06-16T00:00:00.000Z",
    photoUri: "file:///photo.jpg",
  });
}

describe("parseAttributeInput", () => {
  it("parst Ganz- und Dezimalzahlen (Punkt und Komma)", () => {
    expect(parseAttributeInput("120")).toBe(120);
    expect(parseAttributeInput(" 3.5 ")).toBe(3.5);
    expect(parseAttributeInput("3,5")).toBe(3.5);
  });

  it("liefert undefined für leere oder ungültige Eingaben", () => {
    expect(parseAttributeInput("")).toBeUndefined();
    expect(parseAttributeInput("   ")).toBeUndefined();
    expect(parseAttributeInput("abc")).toBeUndefined();
    expect(parseAttributeInput("Infinity")).toBeUndefined();
  });
});

describe("collectProposedAttributes", () => {
  it("übernimmt nur gültige Werte zu bekannten Schema-Schlüsseln", () => {
    const values = collectProposedAttributes({ power: "300", weight: "", unknown: "9" }, DEFS);
    expect(values).toEqual({ power: 300 });
  });
});

describe("draftAttributeInputs", () => {
  it("belegt aus vorhandenen Vorschlägen vor, sonst leer", () => {
    const d = { ...draft(), proposedAttributes: { power: 250 } };
    expect(draftAttributeInputs(d, DEFS)).toEqual({ power: "250", weight: "" });
  });
});

describe("applyDraftEdits", () => {
  it("korrigiert den Objektnamen und setzt Vorschläge", () => {
    const next = applyDraftEdits(draft(), {
      objectName: "  VW Golf VII  ",
      proposedAttributes: { power: 150 },
    });
    expect(next.objectName).toBe("VW Golf VII");
    expect(next.proposedAttributes).toEqual({ power: 150 });
  });

  it("behält den bisherigen Namen bei leerer Eingabe", () => {
    const next = applyDraftEdits(draft(), { objectName: "   " });
    expect(next.objectName).toBe("sports car");
  });

  it("lässt proposedAttributes weg, wenn der Vorschlag leer ist", () => {
    const seeded = { ...draft(), proposedAttributes: { power: 1 } };
    const next = applyDraftEdits(seeded, { proposedAttributes: {} });
    expect("proposedAttributes" in next).toBe(false);
  });

  it("verändert das Original nicht (rein)", () => {
    const original = draft();
    applyDraftEdits(original, { objectName: "X", proposedAttributes: { power: 1 } });
    expect(original.objectName).toBe("sports car");
    expect(original.proposedAttributes).toBeUndefined();
  });

  it("lässt eine bereits geforgte Karte unverändert", () => {
    const forged = forgeCard(draft(), { attributes: { power: 100 }, rarity: Rarity.Rare });
    expect(applyDraftEdits(forged, { objectName: "neu" })).toBe(forged);
  });
});

describe("draftPreviewCard", () => {
  it("spiegelt die Vorschläge in die Karten-Stats", () => {
    const d = { ...draft(), proposedAttributes: { power: 200 } };
    expect(draftPreviewCard(d).attributes).toEqual({ power: 200 });
  });

  it("ohne Vorschläge unverändert", () => {
    const d = draft();
    expect(draftPreviewCard(d)).toBe(d);
  });
});
