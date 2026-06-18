import { describe, expect, it } from "vitest";
import { RARITY_ORDER, Rarity } from "@spotforge/game-core";
import { cardFrameSpec } from "./card-frame-style";
import { RARITY_STYLES } from "./rarity-style";

describe("cardFrameSpec", () => {
  it("nutzt RARITY_STYLES als einzige Farbquelle", () => {
    for (const rarity of RARITY_ORDER) {
      expect(cardFrameSpec(rarity).color).toBe(RARITY_STYLES[rarity].color);
    }
  });

  it("mappt die Stufe auf den RARITY_ORDER-Index", () => {
    expect(cardFrameSpec(Rarity.Common).tier).toBe(0);
    expect(cardFrameSpec(Rarity.Legendary).tier).toBe(RARITY_ORDER.length - 1);
  });

  it("eskaliert Rahmenbreite, Glow und Edelstein-Größe monoton mit der Stufe", () => {
    const specs = RARITY_ORDER.map(cardFrameSpec);
    specs.forEach((spec, i) => {
      if (i === 0) return;
      const prev = specs[i - 1];
      if (!prev) return;
      expect(spec.borderWidth).toBeGreaterThan(prev.borderWidth);
      expect(spec.glowLayers).toBeGreaterThan(prev.glowLayers);
      expect(spec.gemRadius).toBeGreaterThan(prev.gemRadius);
    });
  });

  it("schaltet Eck-Ornamente ab Rare frei", () => {
    expect(cardFrameSpec(Rarity.Common).cornerGems).toBe(false);
    expect(cardFrameSpec(Rarity.Uncommon).cornerGems).toBe(false);
    expect(cardFrameSpec(Rarity.Rare).cornerGems).toBe(true);
    expect(cardFrameSpec(Rarity.Epic).cornerGems).toBe(true);
    expect(cardFrameSpec(Rarity.Legendary).cornerGems).toBe(true);
  });
});
