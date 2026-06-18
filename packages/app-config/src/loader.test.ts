import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DEFAULT_VARIANTS_DIR, loadVariant, resolveVariant } from "./loader";

const variantsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../variants");

describe("resolveVariant", () => {
  it("löst die cars-Variante zu ihren Pfaden auf", () => {
    const resolved = resolveVariant("cars", { variantsDir });
    expect(resolved.name).toBe("cars");
    expect(resolved.dir).toBe(resolve(variantsDir, "cars"));
    expect(resolved.definitionPath).toMatch(/variants[/\\]cars[/\\]app\.definition\.ts$/);
  });

  it("zeigt per Default auf <repo>/variants", () => {
    expect(DEFAULT_VARIANTS_DIR).toBe(variantsDir);
  });

  it("wirft bei unbekannter Variante", () => {
    expect(() => resolveVariant("gibt-es-nicht", { variantsDir })).toThrow(/nicht gefunden/);
  });

  it("weist ungültige Namen und Pfad-Traversal ab", () => {
    expect(() => resolveVariant("../secrets", { variantsDir })).toThrow(/Ungültiger Variantenname/);
    expect(() => resolveVariant("Cars", { variantsDir })).toThrow(/Ungültiger Variantenname/);
    expect(() => resolveVariant("", { variantsDir })).toThrow(/Ungültiger Variantenname/);
  });
});

describe("loadVariant", () => {
  it("lädt und validiert die cars-Variante", async () => {
    const loaded = await loadVariant("cars", { variantsDir });
    expect(loaded.name).toBe("cars");
    expect(loaded.definition.id).toBe("cars");
    expect(loaded.definition.identity.displayName).toBe("CarForge");
  });

  it("löst das Branding (Basis ⊕ Variante) auf", async () => {
    const loaded = await loadVariant("cars", { variantsDir });
    // Theme-Override der Variante (über das geerbte Basis-Theme):
    expect(loaded.branding.theme.colors.primary).toBe("#E10600");
    // Marken-Asset der Variante (absoluter Pfad im cars-Verzeichnis):
    expect(loaded.branding.assets.icon).toMatch(/variants[/\\]cars[/\\]assets[/\\]icon\.png$/);
  });

  it("propagiert Fehler unbekannter Varianten", async () => {
    await expect(loadVariant("gibt-es-nicht", { variantsDir })).rejects.toThrow(/nicht gefunden/);
  });
});
