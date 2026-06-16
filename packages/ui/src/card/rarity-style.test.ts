import { describe, expect, it } from "vitest";
import { Rarity } from "@spotforge/game-core";
import { RARITY_STYLES, rarityStyle } from "./rarity-style";

describe("rarityStyle", () => {
  it("liefert für jede Stufe Farbe und Label", () => {
    for (const rarity of Object.values(Rarity)) {
      const style = rarityStyle(rarity);
      expect(style.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(style.label.length).toBeGreaterThan(0);
    }
  });

  it("deckt genau die fünf Seltenheits-Stufen ab", () => {
    expect(Object.keys(RARITY_STYLES).sort()).toEqual(Object.values(Rarity).sort());
  });

  it("vergibt je Stufe eine eindeutige Farbe", () => {
    const colors = Object.values(RARITY_STYLES).map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
