import { describe, expect, it } from "vitest";

import carsDefinition from "../../../variants/cars/app.definition";
import type { AppDefinition } from "./app-definition";
import type { Branding } from "./branding";
import {
  AppDefinitionError,
  AUTO_SPOT_INTERVAL_MAX_MS,
  AUTO_SPOT_INTERVAL_MIN_MS,
  assertAppDefinition,
  clampAutoSpotInterval,
  DEFAULT_AUTO_SPOT,
  resolveAutoSpot,
  resolveFeatures,
  validateAppDefinition,
  validateBranding,
} from "./index";

/** Tiefe Kopie der cars-Definition als Basis für (un)gültige Varianten. */
function cloneCars(): AppDefinition {
  return structuredClone(carsDefinition);
}

/** Pfade aller gemeldeten Probleme. */
function issuePaths(
  result: { valid: true } | { valid: false; issues: { path: string }[] },
): string[] {
  return result.valid ? [] : result.issues.map((issue) => issue.path);
}

/** Ein strukturell vollständiges, aufgelöstes Branding (absolute Asset-Pfade). */
function validBranding(): Branding {
  return {
    theme: {
      colors: {
        primary: "#E10600",
        secondary: "#1A1A1A",
        background: "#0E0E0E",
        surface: "#1C1C1E",
        text: "#FFFFFF",
        accent: "#FFD400",
      },
      typography: { fontFamily: "Inter" },
      radius: 16,
    },
    assets: {
      icon: "/abs/variants/cars/assets/icon.png",
      splash: "/abs/variants/cars/assets/splash.png",
      logo: "/abs/variants/cars/assets/logo.png",
    },
  };
}

describe("validateAppDefinition", () => {
  it("akzeptiert die cars-Variante (strukturell)", () => {
    const result = validateAppDefinition(carsDefinition);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.definition.id).toBe("cars");
      expect(result.definition.category.primary).toBe("vehicles");
    }
  });

  it("meldet fehlende Pflichtfelder bei leerer Eingabe", () => {
    const result = validateAppDefinition({});
    expect(result.valid).toBe(false);
    const paths = issuePaths(result);
    expect(paths).toEqual(expect.arrayContaining(["id", "identity", "category", "ai", "content"]));
    // theme/assets sind kein Teil der AppDefinition mehr (ADR 0011).
    expect(paths).not.toContain("theme");
    expect(paths).not.toContain("assets");
  });

  it("lehnt eine unbekannte CategoryId ab", () => {
    const bad = cloneCars();
    (bad.category as { primary: string }).primary = "spaceships";
    bad.category.guardrails.allowed = ["vehicles"];
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.primary");
  });

  it("erzwingt minConfidence im Bereich 0..1", () => {
    const bad = cloneCars();
    bad.category.guardrails.minConfidence = 1.5;
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.guardrails.minConfidence");
  });

  it("verlangt Guardrail-Konsistenz: primäre Kategorie ∈ allowed", () => {
    const bad = cloneCars();
    bad.category.guardrails.allowed = ["animals"]; // primary bleibt "vehicles"
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.guardrails.allowed");
    if (!result.valid) {
      const message = result.issues.find((i) => i.path === "category.guardrails.allowed")?.message;
      expect(message).toMatch(/primäre Kategorie/);
    }
  });

  it("meldet einen fehlenden mehrsprachigen Text", () => {
    const bad = cloneCars();
    delete (bad.category.guardrails.rejectMessage as { en?: string }).en;
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.guardrails.rejectMessage.en");
  });

  it("akzeptiert den optionalen features.imageImport-Schalter", () => {
    const def = cloneCars();
    def.features = { imageImport: true };
    expect(validateAppDefinition(def).valid).toBe(true);
  });

  it("lehnt einen nicht-booleschen features-Schalter ab", () => {
    const bad = cloneCars();
    (bad as { features?: unknown }).features = { imageImport: "ja" };
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("features.imageImport");
  });

  it("akzeptiert die optionalen Auto-Spot-Parameter (#85)", () => {
    const def = cloneCars();
    def.category.gate.auto = { intervalMs: 2500, autoFireMinConfidence: 0.7 };
    def.features = { autoSpot: true };
    expect(validateAppDefinition(def).valid).toBe(true);
  });

  it("lehnt eine Auto-Feuer-Schwelle außerhalb 0..1 ab (#85)", () => {
    const bad = cloneCars();
    bad.category.gate.auto = { intervalMs: 2000, autoFireMinConfidence: 1.4 };
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.gate.auto.autoFireMinConfidence");
  });

  it("lehnt ein nicht-positives Auto-Spot-Intervall ab (#85)", () => {
    const bad = cloneCars();
    bad.category.gate.auto = { intervalMs: 0, autoFireMinConfidence: 0.6 };
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.gate.auto.intervalMs");
  });
});

describe("resolveFeatures", () => {
  it("defaultet imageImport/autoSpot auf false, wenn nicht gesetzt", () => {
    const def = cloneCars();
    delete def.features;
    expect(resolveFeatures(def)).toEqual({ imageImport: false, autoSpot: false });
  });

  it("übernimmt einen gesetzten Schalter (cars aktiviert imageImport)", () => {
    expect(resolveFeatures(carsDefinition).imageImport).toBe(true);
  });
});

describe("resolveAutoSpot (#85)", () => {
  it("fällt feldweise auf die Defaults zurück, wenn gate.auto fehlt", () => {
    const def = cloneCars();
    delete def.category.gate.auto;
    expect(resolveAutoSpot(def)).toEqual(DEFAULT_AUTO_SPOT);
  });

  it("überschreibt die Defaults mit den Varianten-Werten", () => {
    const def = cloneCars();
    def.category.gate.auto = { intervalMs: 3000, autoFireMinConfidence: 0.75 };
    expect(resolveAutoSpot(def)).toEqual({ intervalMs: 3000, autoFireMinConfidence: 0.75 });
  });
});

describe("clampAutoSpotInterval (#85)", () => {
  it("klemmt auf den erlaubten Bereich und rundet", () => {
    expect(clampAutoSpotInterval(200)).toBe(AUTO_SPOT_INTERVAL_MIN_MS);
    expect(clampAutoSpotInterval(99999)).toBe(AUTO_SPOT_INTERVAL_MAX_MS);
    expect(clampAutoSpotInterval(2499.6)).toBe(2500);
  });

  it("fällt bei nicht-endlichen Werten auf das Default-Intervall zurück", () => {
    expect(clampAutoSpotInterval(Number.NaN)).toBe(DEFAULT_AUTO_SPOT.intervalMs);
  });
});

describe("validateBranding", () => {
  it("akzeptiert ein vollständiges Branding (Existenzprüfung positiv)", () => {
    const result = validateBranding(validBranding(), { exists: () => true });
    expect(result.valid).toBe(true);
  });

  it("lehnt ungültige Theme-Farben ab", () => {
    const bad = validBranding();
    bad.theme.colors.primary = "rot";
    const result = validateBranding(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("theme.colors.primary");
  });

  it("meldet fehlende Pflicht-Assets strukturell", () => {
    const bad = validBranding();
    delete (bad.assets as { icon?: string }).icon;
    const result = validateBranding(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("assets.icon");
  });

  it("meldet fehlende Asset-Dateien mit klarem Pfad", () => {
    const result = validateBranding(validBranding(), { exists: () => false });
    expect(result.valid).toBe(false);
    const paths = issuePaths(result);
    expect(paths).toContain("assets.icon");
    expect(paths).toContain("assets.logo");
    if (!result.valid) {
      expect(result.issues[0]?.message).toMatch(/nicht gefunden/);
    }
  });
});

describe("assertAppDefinition", () => {
  it("gibt die validierte Definition zurück", () => {
    expect(assertAppDefinition(carsDefinition).id).toBe("cars");
  });

  it("wirft einen AppDefinitionError mit Kontext und Einzelproblemen", () => {
    expect(() => assertAppDefinition({})).toThrow(AppDefinitionError);
    try {
      assertAppDefinition({ id: "kaputt" });
      expect.unreachable("sollte werfen");
    } catch (error) {
      expect(error).toBeInstanceOf(AppDefinitionError);
      const appError = error as AppDefinitionError;
      expect(appError.issues.length).toBeGreaterThan(0);
      expect(appError.message).toContain("'kaputt'");
      expect(appError.message).toContain("ungültig");
    }
  });
});
