import { describe, expect, it, vi } from "vitest";
import type { ModelManifestEntry } from "./manifest";
import {
  applyUpdate,
  compareVersions,
  isModelCompatible,
  selectUpdate,
  type ModelStorageIO,
  type UpdateContext,
} from "./lifecycle";

const ctx: UpdateContext = { appVersion: "1.2.0", runtime: "react-native-executorch@0.9" };

function entry(over: Partial<ModelManifestEntry> = {}): ModelManifestEntry {
  return {
    id: "cars-stanford-vit",
    name: "Stanford Cars ViT",
    version: "1.1.0",
    distribution: "ota",
    category: "vehicles",
    runtime: "react-native-executorch@0.9",
    compat: { appMin: "1.0.0" },
    preprocessor: { normMean: [0.5, 0.5, 0.5], normStd: [0.5, 0.5, 0.5] },
    artifacts: {
      model: { url: "https://x/m.pte", dest: "data/models/m.pte", sha256: "modelhash", bytes: 1 },
      labels: {
        url: "https://x/l.json",
        dest: "data/models/l.json",
        sha256: "labelhash",
        bytes: 2,
      },
    },
    ...over,
  };
}

describe("compareVersions", () => {
  it("vergleicht x.y.z korrekt", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.9.0", "1.0.0")).toBeLessThan(0);
  });
});

describe("isModelCompatible", () => {
  it("akzeptiert passende Runtime und ausreichende App-Version", () => {
    expect(isModelCompatible(entry(), ctx)).toBe(true);
  });
  it("lehnt zu alte App-Version ab", () => {
    expect(isModelCompatible(entry({ compat: { appMin: "2.0.0" } }), ctx)).toBe(false);
  });
  it("lehnt abweichende Runtime ab", () => {
    expect(isModelCompatible(entry({ runtime: "react-native-executorch@0.8" }), ctx)).toBe(false);
  });
});

describe("selectUpdate", () => {
  it("wählt die höchste kompatible, neuere OTA-Version", () => {
    const plan = selectUpdate(
      { id: "cars-stanford-vit", version: "1.0.0" },
      [entry({ version: "1.1.0" }), entry({ version: "1.3.0" }), entry({ version: "1.2.0" })],
      ctx,
    );
    expect(plan?.to).toBe("1.3.0");
    expect(plan?.from).toBe("1.0.0");
  });

  it("ignoriert gebündelte Einträge und nicht-neuere Versionen", () => {
    const plan = selectUpdate(
      { id: "cars-stanford-vit", version: "1.3.0" },
      [entry({ version: "1.3.0", distribution: "bundled" }), entry({ version: "1.2.0" })],
      ctx,
    );
    expect(plan).toBeNull();
  });

  it("liefert null ohne passende ID", () => {
    expect(
      selectUpdate({ id: "other", version: "1.0.0" }, [entry({ version: "2.0.0" })], ctx),
    ).toBeNull();
  });
});

describe("applyUpdate", () => {
  // Modell-Bytes = [1], Label-Bytes = [2]; so bleibt der Test frei von globalem
  // TextEncoder/TextDecoder (nicht im ES2022-lib).
  const MODEL_BYTE = 1;
  const LABELS_BYTE = 2;
  function ioWith(hashes: { model: string; labels: string }): ModelStorageIO {
    return {
      download: vi.fn(async (url: string) =>
        Uint8Array.of(url === "https://x/l.json" ? LABELS_BYTE : MODEL_BYTE),
      ),
      sha256: vi.fn(async (bytes: Uint8Array) =>
        bytes[0] === LABELS_BYTE ? hashes.labels : hashes.model,
      ),
      decodeUtf8: (bytes: Uint8Array) => (bytes[0] === LABELS_BYTE ? '["VW Golf VII 2013"]' : ""),
      persist: vi.fn(async (id, version, role) => `file:///models/${id}-${version}-${role}`),
    };
  }

  it("lädt, verifiziert und persistiert Modell + Labels", async () => {
    const io = ioWith({ model: "modelhash", labels: "labelhash" });
    const applied = await applyUpdate({ entry: entry(), from: "1.0.0", to: "1.1.0" }, io);
    expect(applied.version).toBe("1.1.0");
    expect(applied.modelPath).toContain("model");
    expect(applied.labels).toEqual(["VW Golf VII 2013"]);
    expect(io.persist).toHaveBeenCalledTimes(2);
  });

  it("wirft bei SHA-256-Mismatch und persistiert nichts Ungültiges", async () => {
    const io = ioWith({ model: "WRONG", labels: "labelhash" });
    await expect(applyUpdate({ entry: entry(), from: "1.0.0", to: "1.1.0" }, io)).rejects.toThrow(
      /SHA-256/,
    );
  });
});
