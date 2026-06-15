import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import carsDefinition from "../../../variants/cars/app.definition";
import type { AppDefinition } from "./app-definition";
import { AppDefinitionError, assertAppDefinition, validateAppDefinition } from "./index";

const carsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../variants/cars");
/** Echte Existenzprüfung gegen die cars-Assets auf der Platte. */
const realAssets = { root: carsDir, exists: existsSync, resolve };

/** Tiefe Kopie der cars-Definition als Basis für (un)gültige Varianten. */
function cloneCars(): AppDefinition {
  return structuredClone(carsDefinition);
}

/** Pfade aller gemeldeten Probleme. */
function issuePaths(result: ReturnType<typeof validateAppDefinition>): string[] {
  return result.valid ? [] : result.issues.map((issue) => issue.path);
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

  it("akzeptiert die cars-Variante inklusive vorhandener Asset-Dateien", () => {
    const result = validateAppDefinition(carsDefinition, { assets: realAssets });
    expect(result.valid).toBe(true);
  });

  it("meldet fehlende Pflichtfelder bei leerer Eingabe", () => {
    const result = validateAppDefinition({});
    expect(result.valid).toBe(false);
    const paths = issuePaths(result);
    expect(paths).toEqual(
      expect.arrayContaining(["id", "identity", "category", "ai", "theme", "content", "assets"]),
    );
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

  it("lehnt ungültige Theme-Farben ab", () => {
    const bad = cloneCars();
    bad.theme.colors.primary = "rot";
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("theme.colors.primary");
  });

  it("meldet einen fehlenden mehrsprachigen Text", () => {
    const bad = cloneCars();
    delete (bad.category.guardrails.rejectMessage as { en?: string }).en;
    const result = validateAppDefinition(bad);
    expect(result.valid).toBe(false);
    expect(issuePaths(result)).toContain("category.guardrails.rejectMessage.en");
  });

  it("meldet fehlende Asset-Dateien mit klarem Pfad", () => {
    const result = validateAppDefinition(carsDefinition, {
      assets: { root: "/nicht/vorhanden", exists: () => false, resolve },
    });
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
