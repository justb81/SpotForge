import { describe, expect, it } from "vitest";
import { MANIFEST_SCHEMA_VERSION, parseManifest } from "./manifest";

const validEntry = {
  id: "cars-stanford-vit",
  name: "Stanford Cars ViT",
  version: "1.0.0",
  distribution: "ota",
  category: "vehicles",
  runtime: "react-native-executorch@0.9",
  compat: { appMin: "0.1.0" },
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
    expect(m.models[0]?.id).toBe("cars-stanford-vit");
    expect(m.models[0]?.preprocessor?.normMean).toEqual([0.5, 0.5, 0.5]);
    expect(m.models[0]?.artifacts.labels?.url).toBe("https://example/labels.json");
  });

  it("akzeptiert preprocessor=null und fehlende Labels (eingebautes Modell)", () => {
    const builtin = {
      ...validEntry,
      distribution: "bundled",
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

  it("wirft bei ungültiger distribution", () => {
    expect(() =>
      parseManifest({
        schemaVersion: MANIFEST_SCHEMA_VERSION,
        models: [{ ...validEntry, distribution: "cdn" }],
      }),
    ).toThrow(/distribution/);
  });

  it("wirft bei fehlendem compat.appMin", () => {
    const { compat: _omit, ...withoutCompat } = validEntry;
    void _omit;
    expect(() =>
      parseManifest({ schemaVersion: MANIFEST_SCHEMA_VERSION, models: [withoutCompat] }),
    ).toThrow(/compat\.appMin/);
  });
});
