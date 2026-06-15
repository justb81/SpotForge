import { describe, expect, it } from "vitest";
import { compareAttribute, type AttributeDefinition } from "./attribute";

const power: AttributeDefinition = {
  key: "power",
  label: "PS",
  unit: "PS",
  trumpfable: true,
  higherIsBetter: true,
};

const acceleration: AttributeDefinition = {
  key: "acceleration",
  label: "0–100 km/h",
  unit: "s",
  trumpfable: true,
  higherIsBetter: false,
};

describe("compareAttribute", () => {
  it("höher gewinnt, wenn higherIsBetter = true", () => {
    expect(compareAttribute(power, 320, 110)).toBeGreaterThan(0);
    expect(compareAttribute(power, 110, 320)).toBeLessThan(0);
  });

  it("niedriger gewinnt, wenn higherIsBetter = false", () => {
    expect(compareAttribute(acceleration, 3.2, 9.5)).toBeGreaterThan(0);
    expect(compareAttribute(acceleration, 9.5, 3.2)).toBeLessThan(0);
  });

  it("Gleichstand ergibt 0", () => {
    expect(compareAttribute(power, 200, 200)).toBe(0);
    expect(compareAttribute(acceleration, 5, 5)).toBe(0);
  });
});
