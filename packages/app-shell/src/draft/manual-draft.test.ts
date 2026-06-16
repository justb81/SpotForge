import { describe, expect, it } from "vitest";
import type { AppDefinition } from "@spotforge/app-config";
import { buildManualDraft } from "./manual-draft";

const definition = {
  id: "test",
  identity: {
    displayName: "Test",
    slug: "test",
    scheme: "test",
    ios: { bundleIdentifier: "com.test" },
    android: { package: "com.test" },
  },
  category: {
    primary: "vehicles",
    guardrails: {
      allowed: ["vehicles"],
      minConfidence: 0.6,
      rejectMessage: { de: "Kein Fahrzeug.", en: "Not a vehicle." },
    },
    gate: { allow: ["sports car"] },
  },
  ai: { cardArtPrompt: "", factPrompt: "" },
  content: {},
} satisfies AppDefinition;

const deps = { newId: () => "fixed-id", now: () => "2026-06-16T12:00:00.000Z" };

describe("buildManualDraft", () => {
  it("legt einen Draft der App-Kategorie mit getrimmtem Namen an", () => {
    const card = buildManualDraft(
      definition,
      { objectName: "  Tesla Model 3  ", photoUri: "file:///t.jpg", spottedBy: "tester" },
      deps,
    );
    expect(card.objectName).toBe("Tesla Model 3");
    expect(card.categoryId).toBe("vehicles");
    expect(card.status).toBe("draft");
    expect(card.attributes).toEqual({});
    expect(card.photoUri).toBe("file:///t.jpg");
    expect(card.id).toBe("fixed-id");
    expect(card.createdAt).toBe("2026-06-16T12:00:00.000Z");
  });

  it("übernimmt eine optionale Fundregion", () => {
    const card = buildManualDraft(
      definition,
      { objectName: "Bus", photoUri: "file:///b.jpg", spottedBy: "t", geoRegion: "10115" },
      deps,
    );
    expect(card.geoRegion).toBe("10115");
  });
});
