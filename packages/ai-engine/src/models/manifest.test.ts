import { describe, expect, it } from "vitest";
import { MANIFEST_SCHEMA_VERSION, parseManifest } from "./manifest";

const validEntry = {
  id: "cars-jordo23",
  name: "Jordo23 Vehicle Classifier",
  version: "1.0.0",
  category: "vehicles",
  preprocessor: { normMean: [0.5, 0.5, 0.5], normStd: [0.5, 0.5, 0.5] },
  artifacts: {
    model: { url: "https://example/model.pte", dest: "data/models/m.pte", sha256: "abc", bytes: 1 },
    labels: {
      url: "https://example/labels.json",
      dest: "data/models/l.json",
      sha256: "def",
      bytes: 2,
    },
  },
};

describe("parseManifest", () => {
  it("parst einen gültigen Eintrag", () => {
    const m = parseManifest({ schemaVersion: MANIFEST_SCHEMA_VERSION, models: [validEntry] });
    expect(m.models).toHaveLength(1);
    expect(m.models[0]?.id).toBe("cars-jordo23");
    expect(m.models[0]?.preprocessor?.normMean).toEqual([0.5, 0.5, 0.5]);
    expect(m.models[0]?.artifacts.labels?.url).toBe("https://example/labels.json");
  });

  it("akzeptiert preprocessor=null und fehlende Labels (eingebautes Modell)", () => {
    const builtin = {
      ...validEntry,
      preprocessor: null,
      artifacts: { model: validEntry.artifacts.model },
    };
    const m = parseManifest({ schemaVersion: MANIFEST_SCHEMA_VERSION, models: [builtin] });
    expect(m.models[0]?.preprocessor).toBeNull();
    expect(m.models[0]?.artifacts.labels).toBeUndefined();
  });

  it("wirft bei falscher schemaVersion", () => {
    expect(() => parseManifest({ schemaVersion: 1, models: [] })).toThrow(/schemaVersion/);
  });

  it("wirft bei fehlenden Artefakten", () => {
    const { artifacts: _omit, ...withoutArtifacts } = validEntry;
    void _omit;
    expect(() =>
      parseManifest({ schemaVersion: MANIFEST_SCHEMA_VERSION, models: [withoutArtifacts] }),
    ).toThrow(/artifacts/);
  });

  it("wirft bei leerer Kategorie", () => {
    expect(() =>
      parseManifest({
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        models: [{ ...validEntry, category: "" }],
      }),
    ).toThrow(/category/);
  });
});
