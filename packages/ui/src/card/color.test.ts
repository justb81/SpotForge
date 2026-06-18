import { describe, expect, it } from "vitest";
import { darken, hexToRgb, lighten, mix, rgbToHex } from "./color";

describe("hexToRgb", () => {
  it("parst #RRGGBB", () => {
    expect(hexToRgb("#3B9DFF")).toEqual({ r: 0x3b, g: 0x9d, b: 0xff });
  });

  it("expandiert die Kurzform #RGB", () => {
    expect(hexToRgb("#0af")).toEqual({ r: 0x00, g: 0xaa, b: 0xff });
  });

  it("wirft bei ungültiger Eingabe", () => {
    expect(() => hexToRgb("rot")).toThrow(/Ungültige Hex-Farbe/);
  });
});

describe("rgbToHex", () => {
  it("serialisiert und klemmt Kanäle", () => {
    expect(rgbToHex({ r: 0, g: 170, b: 255 })).toBe("#00aaff");
    expect(rgbToHex({ r: -5, g: 300, b: 128 })).toBe("#00ff80");
  });
});

describe("mix/lighten/darken", () => {
  it("mischt linear zwischen zwei Farben", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("lighten zieht Richtung Weiß, darken Richtung Schwarz", () => {
    expect(lighten("#808080", 1)).toBe("#ffffff");
    expect(darken("#808080", 1)).toBe("#000000");
    expect(lighten("#808080", 0)).toBe("#808080");
  });
});
