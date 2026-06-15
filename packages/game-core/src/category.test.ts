import { describe, expect, it } from "vitest";
import { findAttribute, type CategoryDefinition } from "./category";

const vehicles: CategoryDefinition = {
  id: "vehicles",
  name: "Fahrzeuge",
  emoji: "🚗",
  examples: ["PKW", "Motorräder"],
  attributes: [
    { key: "power", label: "PS", unit: "PS", trumpfable: true, higherIsBetter: true },
    {
      key: "topSpeed",
      label: "Höchstgeschwindigkeit",
      unit: "km/h",
      trumpfable: true,
      higherIsBetter: true,
    },
  ],
};

describe("findAttribute", () => {
  it("findet eine Attribut-Definition per Schlüssel", () => {
    expect(findAttribute(vehicles, "power")?.label).toBe("PS");
    expect(findAttribute(vehicles, "topSpeed")?.unit).toBe("km/h");
  });

  it("liefert undefined für unbekannte Schlüssel", () => {
    expect(findAttribute(vehicles, "nope")).toBeUndefined();
  });
});
