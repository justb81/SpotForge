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

  it("erbt einen Hintergrund aus der Basis, wenn die Variante keinen liefert", () => {
    const resolved = resolveBranding({
      base: { ...base, assets: { background: "./assets/bg.png" } },
      baseDir: "variants/_default",
      variant,
      variantDir: "variants/cars",
    });
    expect(resolved.assets.background).toBe("variants/_default/assets/bg.png");
  });
});
