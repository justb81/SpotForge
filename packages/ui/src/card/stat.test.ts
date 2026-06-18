import { describe, expect, it } from "vitest";
import type { AttributeDefinition } from "@spotforge/game-core";
import { formatStatValue, toStatDisplays } from "./stat";

const defs: AttributeDefinition[] = [
  { key: "power", label: "PS", unit: "PS", trumpfable: true, higherIsBetter: true },
  { key: "topSpeed", label: "Höchstgeschw.", unit: "km/h", trumpfable: true, higherIsBetter: true },
  { key: "seats", label: "Sitze", unit: "", trumpfable: false, higherIsBetter: true },
];

describe("formatStatValue", () => {
  it("hängt die Einheit an, wenn vorhanden", () => {
    expect(formatStatValue(240, "km/h")).toBe("240 km/h");
  });

  it("lässt einheitenlose Werte unverändert", () => {
    expect(formatStatValue(5, "")).toBe("5");
  });
});

describe("toStatDisplays", () => {
  it("folgt der Reihenfolge des Schemas und formatiert die Werte", () => {
    const rows = toStatDisplays({ topSpeed: 250, power: 150, seats: 5 }, defs);
    expect(rows.map((r) => r.key)).toEqual(["power", "topSpeed", "seats"]);
    expect(rows[0]).toMatchObject({ label: "PS", formatted: "150 PS", trumpfable: true });
    expect(rows[2]).toMatchObject({ formatted: "5", trumpfable: false });
  });

  it("überspringt Attribute ohne Wert auf der Karte", () => {
    const rows = toStatDisplays({ power: 150 }, defs);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.key).toBe("power");
    expect(rows[0]?.present).toBe(true);
  });

  it("ignoriert Werte ohne passende Definition", () => {
    const rows = toStatDisplays({ power: 150, unknown: 99 }, defs);
    expect(rows.map((r) => r.key)).toEqual(["power"]);
  });

  it("gibt mit includeMissing alle Attribute als Platzhalter-Reihen aus", () => {
    const rows = toStatDisplays({ power: 150 }, defs, { includeMissing: true });
    expect(rows.map((r) => r.key)).toEqual(["power", "topSpeed", "seats"]);
    expect(rows[0]).toMatchObject({ formatted: "150 PS", present: true });
    expect(rows[1]).toMatchObject({ key: "topSpeed", formatted: "—", present: false });
  });

  it("respektiert einen eigenen Platzhalter", () => {
    const rows = toStatDisplays({}, defs, { includeMissing: true, missingPlaceholder: "?" });
    expect(rows.every((r) => r.formatted === "?" && !r.present)).toBe(true);
  });
});
