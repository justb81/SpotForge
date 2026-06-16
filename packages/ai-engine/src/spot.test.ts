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
  return { gate, decision: { accepted: false } };
}

function accepted(gate: ClassificationResult, fine: ClassificationResult): CascadeResult {
  return { gate, decision: { accepted: true, matched: gate.candidates[0] }, fine };
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
    if (out.kind === "draft") {
      expect(out.card.status).toBe("draft");
      expect(out.card.objectName).toBe("VW Golf VII");
      expect(out.card.photoUri).toBe("file:///golf.jpg");
      expect(out.card.proposedAttributes).toEqual({ power: 110 });
      expect(out.card.id).toBe("draft-1");
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
