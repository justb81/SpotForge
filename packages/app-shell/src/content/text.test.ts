import { describe, expect, it } from "vitest";
import type { ContentOverrides } from "@spotforge/app-config";
import { createTextResolver } from "./text";
import { DEFAULT_CONTENT } from "./defaults";

describe("createTextResolver", () => {
  it("löst einen Default in der gewünschten Sprache auf", () => {
    const t = createTextResolver({}, "en");
    expect(t("spot.cta")).toBe("Spot");
    const tDe = createTextResolver({}, "de");
    expect(tDe("spot.cta")).toBe("Spotten");
  });

  it("bevorzugt Varianten-Overrides vor Defaults", () => {
    const overrides: ContentOverrides = {
      "collection.title": { de: "Garage", en: "Garage" },
    };
    const t = createTextResolver(overrides, "de");
    expect(t("collection.title")).toBe("Garage");
    // Nicht überschriebene Schlüssel kommen weiter aus den Defaults.
    expect(t("battle.title")).toBe("Duell");
  });

  it("fällt bei unbekanntem Schlüssel auf den Schlüssel selbst zurück", () => {
    const t = createTextResolver({}, "de");
    expect(t("does.not.exist")).toBe("does.not.exist");
  });

  it("ersetzt Platzhalter über die vars-Map", () => {
    const t = createTextResolver({}, "en");
    expect(t("feature.locked", { level: 5 })).toBe("Unlocks at level 5.");
  });

  it("lässt unbekannte Platzhalter unverändert stehen", () => {
    const t = createTextResolver({ greet: { de: "Hi {name}", en: "Hi {name}" } }, "de");
    expect(t("greet", { other: "x" })).toBe("Hi {name}");
  });

  it("hält für jeden Default beide Sprachen vor", () => {
    for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
      expect(value.de, `de fehlt für ${key}`).toBeTruthy();
      expect(value.en, `en fehlt für ${key}`).toBeTruthy();
    }
  });
});
