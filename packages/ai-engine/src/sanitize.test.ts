import { describe, expect, it, vi } from "vitest";
import type { ResolvedSanitization } from "@spotforge/app-config";
import {
  createPhotoSanitizer,
  SanitizationError,
  type BlurRegion,
  type ImageProcessor,
  type ProcessImageRequest,
  type ProcessedImage,
  type RegionDetector,
} from "./sanitize";

// --- Test-Helfer -------------------------------------------------------------

function config(overrides: Partial<ResolvedSanitization["blur"]> = {}): ResolvedSanitization {
  return {
    encode: { maxEdge: 2048, quality: 0.85 },
    blur: { faces: true, licensePlates: false, ...overrides },
  };
}

/** Detektor, der feste Boxen liefert (kind wird von der Pipeline überschrieben). */
function detectorReturning(boxes: Omit<BlurRegion, "kind">[]): RegionDetector {
  return {
    detect: vi.fn(async () => boxes.map((b) => ({ ...b, kind: "face" as const }))),
  };
}

/** Prozessor, der ein bereinigtes Bild meldet (Metadaten entfernt). */
function okProcessor(over: Partial<ProcessedImage> = {}): ImageProcessor {
  return {
    process: vi.fn(
      async (_req: ProcessImageRequest): Promise<ProcessedImage> => ({
        imageUri: "file://clean.jpg",
        format: "jpeg",
        width: 2048,
        height: 1536,
        bytes: 320_000,
        metadataStripped: true,
        ...over,
      }),
    ),
  };
}

const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

// --- Tests -------------------------------------------------------------------

describe("createPhotoSanitizer", () => {
  it("strippt Metadaten und liefert ein upload-bereites Bild (nur Gesichts-Blur)", async () => {
    const processor = okProcessor();
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face: detectorReturning([box, box]) },
      processor,
    });

    const result = await sanitize({ imageUri: "file://raw.jpg" });

    expect(result.imageUri).toBe("file://clean.jpg");
    expect(result.report.metadataStripped).toBe(true);
    expect(result.report.blurred).toEqual({ face: 2, licensePlate: 0 });
    expect(result.report.output.format).toBe("jpeg");
  });

  it("fragt nur die laut Config aktiven Ziele ab", async () => {
    const face = detectorReturning([box]);
    const plate = detectorReturning([box]);
    // Kennzeichen-Blur AUS: der Plate-Detektor darf nicht laufen.
    const sanitize = createPhotoSanitizer(config({ licensePlates: false }), {
      detectors: { face, licensePlate: plate },
      processor: okProcessor(),
    });

    await sanitize({ imageUri: "file://raw.jpg" });

    expect(face.detect).toHaveBeenCalledOnce();
    expect(plate.detect).not.toHaveBeenCalled();
  });

  it("blurrt Kennzeichen, wenn die Variante es aktiviert (CarForge)", async () => {
    const processor = okProcessor();
    const sanitize = createPhotoSanitizer(config({ faces: true, licensePlates: true }), {
      detectors: {
        face: detectorReturning([box]),
        licensePlate: detectorReturning([box, box]),
      },
      processor,
    });

    const result = await sanitize({ imageUri: "file://raw.jpg" });

    expect(result.report.blurred).toEqual({ face: 1, licensePlate: 2 });
    // Alle erkannten Regionen gehen – korrekt getaggt – an den Prozessor.
    const req = (processor.process as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ProcessImageRequest;
    expect(req.blurRegions).toHaveLength(3);
    expect(req.blurRegions.filter((r) => r.kind === "licensePlate")).toHaveLength(2);
    expect(req.blurRegions.filter((r) => r.kind === "face")).toHaveLength(1);
    expect(req.encode).toEqual({ maxEdge: 2048, quality: 0.85 });
  });

  it("strippt auch ohne erkannte Regionen (reines EXIF-Stripping + Re-Enkodierung)", async () => {
    const processor = okProcessor();
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face: detectorReturning([]) },
      processor,
    });

    const result = await sanitize({ imageUri: "file://raw.jpg" });

    expect(result.report.blurred).toEqual({ face: 0, licensePlate: 0 });
    const req = (processor.process as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ProcessImageRequest;
    expect(req.blurRegions).toHaveLength(0);
    expect(result.report.metadataStripped).toBe(true);
  });

  it("blockt den Upload, wenn ein aktives Ziel keinen Detektor hat", async () => {
    const sanitize = createPhotoSanitizer(config({ licensePlates: true }), {
      detectors: { face: detectorReturning([box]) }, // licensePlate fehlt
      processor: okProcessor(),
    });

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(SanitizationError);
  });

  it("blockt den Upload, wenn die Detektion fehlschlägt (kein Rohbild-Fallback)", async () => {
    const processor = okProcessor();
    const failing: RegionDetector = { detect: vi.fn(async () => Promise.reject(new Error("boom"))) };
    const sanitize = createPhotoSanitizer(config(), { detectors: { face: failing }, processor });

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(SanitizationError);
    // Der Prozessor (und damit ein etwaiger Upload) wird gar nicht erst erreicht.
    expect(processor.process).not.toHaveBeenCalled();
  });

  it("blockt den Upload, wenn der Prozessor das Stripping nicht bestätigt", async () => {
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face: detectorReturning([]) },
      processor: okProcessor({ metadataStripped: false }),
    });

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(SanitizationError);
  });
});
