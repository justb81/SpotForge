import { describe, expect, it } from "vitest";

import carsDefinition from "../../../variants/cars/app.definition";
import type { AppDefinition } from "./app-definition";
import type { Branding } from "./branding";
import {
  AppDefinitionError,
  assertAppDefinition,
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
      cardFrames: { legendary: "/abs/variants/_default/assets/frames/legendary.png" },
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
    expect(paths).toContain("assets.cardFrames.legendary");
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
