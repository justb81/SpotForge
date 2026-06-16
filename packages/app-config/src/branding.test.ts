import { describe, expect, it } from "vitest";

import { defineBranding, resolveBranding, type BrandingInput } from "./branding";

const base: BrandingInput = defineBranding({
  theme: {
    colors: {
      primary: "#000000",
      secondary: "#111111",
      background: "#222222",
      surface: "#333333",
      text: "#FFFFFF",
      accent: "#FACC15",
    },
    typography: { fontFamily: "System" },
    radius: 12,
  },
  assets: {
    cardFrames: {
      common: "./assets/frames/common.png",
      legendary: "./assets/frames/legendary.png",
    },
  },
});

const variant: BrandingInput = defineBranding({
  theme: { colors: { primary: "#E10600" }, radius: 16 },
  assets: {
    icon: "./assets/icon.png",
    splash: "./assets/splash.png",
    logo: "./assets/logo.png",
  },
});

function resolve() {
  return resolveBranding({
    base,
    baseDir: "variants/_default",
    variant,
    variantDir: "variants/cars",
  });
}

describe("resolveBranding", () => {
  it("merged das Theme tief: Variante überschreibt nur gesetzte Werte", () => {
    const { theme } = resolve();
    expect(theme.colors.primary).toBe("#E10600"); // aus Variante
    expect(theme.colors.background).toBe("#222222"); // aus Basis geerbt
    expect(theme.typography.fontFamily).toBe("System"); // aus Basis geerbt
    expect(theme.radius).toBe(16); // aus Variante
  });

  it("löst Varianten-Assets gegen das Variantenverzeichnis auf", () => {
    const { assets } = resolve();
    expect(assets.icon).toBe("variants/cars/assets/icon.png");
    expect(assets.splash).toBe("variants/cars/assets/splash.png");
    expect(assets.logo).toBe("variants/cars/assets/logo.png");
  });

  it("erbt nicht überschriebene Frames aus der Basis (mit Basis-Verzeichnis)", () => {
    const { assets } = resolve();
    expect(assets.cardFrames?.common).toBe("variants/_default/assets/frames/common.png");
    expect(assets.cardFrames?.legendary).toBe("variants/_default/assets/frames/legendary.png");
  });

  it("lässt eine Variante einzelne Frame-Stufen überschreiben", () => {
    const resolved = resolveBranding({
      base,
      baseDir: "variants/_default",
      variant: {
        ...variant,
        assets: { ...variant.assets, cardFrames: { legendary: "./assets/frames/legendary.png" } },
      },
      variantDir: "variants/cars",
    });
    expect(resolved.assets.cardFrames?.legendary).toBe("variants/cars/assets/frames/legendary.png");
    expect(resolved.assets.cardFrames?.common).toBe("variants/_default/assets/frames/common.png");
  });
});
