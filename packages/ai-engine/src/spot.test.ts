import { describe, expect, it, vi } from "vitest";
import type { AppDefinition } from "@spotforge/app-config";
import type { CascadeClassifier, CascadeResult } from "./cascade";
import type { ClassificationResult } from "./classifier";
import {
  createSpot,
  gateConfigFromAppDefinition,
  slugLabelResolver,
  type FactLookup,
  type LabelResolver,
} from "./spot";

// --- Test-Helfer -------------------------------------------------------------

function classification(candidates: [string, number][]): ClassificationResult {
  const cs = candidates.map(([label, confidence]) => ({ label, confidence }));
  return { label: cs[0]?.label ?? "", confidence: cs[0]?.confidence ?? 0, candidates: cs };
}

/** Kaskade, die ein festes Ergebnis liefert. */
function fixedCascade(out: CascadeResult): CascadeClassifier {
  return { classify: vi.fn(async () => out) };
}

function rejected(gate: ClassificationResult): CascadeResult {
  return { gate, decision: { accepted: false, mass: 0 }, timings: { gateMs: 12, totalMs: 12 } };
}

function accepted(gate: ClassificationResult, fine: ClassificationResult): CascadeResult {
  const matched = gate.candidates[0];
  return {
    gate,
    decision: { accepted: true, mass: matched?.confidence ?? 0, matched },
    fine,
    timings: { gateMs: 12, fineMs: 30, totalMs: 42 },
  };
}

/** Minimale, schema-gültige AppDefinition der Auto-App. */
function makeAppDef(): AppDefinition {
  return {
    id: "cars",
    identity: {
      displayName: "CarForge",
      slug: "carforge",
      scheme: "carforge",
      ios: { bundleIdentifier: "com.spotforge.cars" },
      android: { package: "com.spotforge.cars" },
    },
    category: {
      primary: "vehicles",
      guardrails: {
        allowed: ["vehicles"],
        minConfidence: 0.6,
        rejectMessage: { de: "Kein Fahrzeug.", en: "Not a vehicle." },
      },
      gate: { allow: ["sports car", "pickup"] },
    },
    ai: { cardArtPrompt: "art {objectName}", factPrompt: "facts {objectName}" },
    content: {},
  };
}

const clock = {
  newId: (): string => "draft-1",
  now: (): string => "2026-06-15T08:00:00.000Z",
};

// --- Tests -------------------------------------------------------------------

describe("gateConfigFromAppDefinition", () => {
  it("leitet Allowlist und Schwelle aus der AppDefinition ab", () => {
    expect(gateConfigFromAppDefinition(makeAppDef())).toEqual({
      allow: ["sports car", "pickup"],
      minConfidence: 0.6,
    });
  });
});

describe("slugLabelResolver", () => {
  it("bildet Label → Slug/Anzeigename ab", () => {
    expect(slugLabelResolver.resolve("VW Golf VII")).toEqual({
      objectId: "vw-golf-vii",
      objectName: "VW Golf VII",
    });
  });

  it("gibt undefined für leere Labels", () => {
    expect(slugLabelResolver.resolve("   ")).toBeUndefined();
  });
});

describe("createSpot", () => {
  it("liefert eine Draft-Karte bei akzeptiertem Gate + erkanntem Feinmodell", async () => {
    const factLookup: FactLookup = { find: () => ({ attributes: { power: 110 } }) };
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(
        accepted(classification([["sports car", 0.9]]), classification([["VW Golf VII", 0.8]])),
      ),
      resolver: slugLabelResolver,
      factLookup,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///golf.jpg", spottedBy: "user-42" });
    expect(out.kind).toBe("draft");
    // Kaskaden-Latenzen werden für die On-Screen-Geräte-Verifikation (#63) durchgereicht.
    expect(out.timings).toEqual({ gateMs: 12, fineMs: 30, totalMs: 42 });
    // Summierte Gate-Masse für die Auto-Spot-Schwelle (#85) durchgereicht.
    expect(out.gateMass).toBeCloseTo(0.9);
    if (out.kind === "draft") {
      expect(out.card.status).toBe("draft");
      expect(out.card.objectName).toBe("VW Golf VII");
      expect(out.card.photoUri).toBe("file:///golf.jpg");
      expect(out.card.proposedAttributes).toEqual({ power: 110 });
      expect(out.card.id).toBe("draft-1");
      // Feinmodell-Ergebnis für die Konfidenz-Anzeige durchgereicht.
      expect(out.recognition?.label).toBe("VW Golf VII");
      expect(out.recognition?.confidence).toBeCloseTo(0.8);
    }
  });

  it("liefert rejected mit erkanntem Label, wenn das Gate ablehnt", async () => {
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(rejected(classification([["tabby cat", 0.97]]))),
      resolver: slugLabelResolver,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///cat.jpg", spottedBy: "user-42" });
    expect(out.kind).toBe("rejected");
    // Auch im Reject-Pfad wird die (niedrige) Gate-Masse durchgereicht (#85).
    expect(out.gateMass).toBe(0);
    if (out.kind === "rejected") {
      expect(out.message).toBe("Kein Fahrzeug.");
      expect(out.detectedLabel).toBe("tabby cat");
    }
  });

  it("liefert unrecognized, wenn das Label nicht auflösbar ist", async () => {
    const resolver: LabelResolver = { resolve: () => undefined };
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(
        accepted(classification([["sports car", 0.9]]), classification([["???", 0.5]])),
      ),
      resolver,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///x.jpg", spottedBy: "user-42" });
    expect(out.kind).toBe("unrecognized");
    if (out.kind === "unrecognized") expect(out.label).toBe("???");
  });
});

describe("createSpot – Foto-Sanitisierung (#89)", () => {
  // Sanitizer, der eine neue, „bereinigte" URI zurückgibt.
  const sanitizePhoto = vi.fn(async (input: { imageUri: string }) => ({
    imageUri: `${input.imageUri}#sanitized`,
    report: {
      metadataStripped: true as const,
      redacted: { face: 0, licensePlate: 0 },
      output: {
        imageUri: `${input.imageUri}#sanitized`,
        format: "jpeg" as const,
        width: 1024,
        height: 768,
        bytes: 1234,
      },
    },
  }));

  it("erkennt auf dem Original, persistiert im Draft aber das sanitisierte Foto", async () => {
    const cascade = fixedCascade(
      accepted(classification([["sports car", 0.9]]), classification([["VW Golf VII", 0.8]])),
    );
    const spot = createSpot(makeAppDef(), {
      cascade,
      resolver: slugLabelResolver,
      sanitizePhoto,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///golf.jpg", spottedBy: "user-42" });

    // Erkennung lief auf dem ORIGINAL …
    expect(cascade.classify).toHaveBeenCalledWith({ imageUri: "file:///golf.jpg" });
    // … aber Draft + Ergebnis tragen das SANITISIERTE Foto.
    expect(out.photoUri).toBe("file:///golf.jpg#sanitized");
    if (out.kind === "draft") expect(out.card.photoUri).toBe("file:///golf.jpg#sanitized");
    expect(sanitizePhoto).toHaveBeenCalledWith({ imageUri: "file:///golf.jpg" });
    // Der Sanitisierungs-Report wird fürs On-Screen-Diagnose-Panel mitgereicht.
    expect(out.sanitization?.metadataStripped).toBe(true);
    expect(out.sanitization?.output.bytes).toBe(1234);
  });

  it("reicht das sanitisierte Foto auch im unrecognized-Pfad mit (für den manuellen Draft)", async () => {
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(
        accepted(classification([["sports car", 0.9]]), classification([["???", 0.5]])),
      ),
      resolver: { resolve: () => undefined },
      sanitizePhoto,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///x.jpg", spottedBy: "user-42" });
    expect(out.kind).toBe("unrecognized");
    expect(out.photoUri).toBe("file:///x.jpg#sanitized");
  });

  it("sanitisiert NICHT, wenn das Gate ablehnt (kein Draft persistiert)", async () => {
    const sanitize = vi.fn(); // frischer Mock: darf im Reject-Pfad nie laufen
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(rejected(classification([["tabby cat", 0.97]]))),
      resolver: slugLabelResolver,
      sanitizePhoto: sanitize,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///cat.jpg", spottedBy: "user-42" });
    expect(out.kind).toBe("rejected");
    expect(out.photoUri).toBeUndefined();
    expect(sanitize).not.toHaveBeenCalled();
  });

  it("bricht ab (kein Draft mit Rohbild), wenn die Sanitisierung fehlschlägt", async () => {
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(
        accepted(classification([["sports car", 0.9]]), classification([["VW Golf VII", 0.8]])),
      ),
      resolver: slugLabelResolver,
      sanitizePhoto: () => Promise.reject(new Error("sanitize failed")),
      ...clock,
    });

    await expect(spot({ imageUri: "file:///golf.jpg", spottedBy: "user-42" })).rejects.toThrow(
      "sanitize failed",
    );
  });

  it("hält ohne Sanitizer die Original-URI (Übergangszustand)", async () => {
    const spot = createSpot(makeAppDef(), {
      cascade: fixedCascade(
        accepted(classification([["sports car", 0.9]]), classification([["VW Golf VII", 0.8]])),
      ),
      resolver: slugLabelResolver,
      ...clock,
    });

    const out = await spot({ imageUri: "file:///golf.jpg", spottedBy: "user-42" });
    expect(out.photoUri).toBe("file:///golf.jpg");
    if (out.kind === "draft") expect(out.card.photoUri).toBe("file:///golf.jpg");
  });
});
