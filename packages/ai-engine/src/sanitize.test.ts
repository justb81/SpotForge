import { describe, expect, it, vi } from "vitest";
import type { ResolvedSanitization } from "@spotforge/app-config";
import {
  createPhotoSanitizer,
  formatSanitizationReport,
  SanitizationError,
  type DetectedRegion,
  type ImageProcessor,
  type ProcessImageRequest,
  type ProcessedImage,
  type RegionDetector,
} from "./sanitize";

// --- Test-Helfer -------------------------------------------------------------

type RedactOverrides = Partial<ResolvedSanitization["redact"]>;

function config(redact: RedactOverrides = {}): ResolvedSanitization {
  return {
    encode: { maxEdge: 2048, quality: 0.85 },
    redact: {
      faces: { enabled: true, style: "blur" },
      licensePlates: { enabled: false, style: "blur" },
      ...redact,
    },
  };
}

/** Detektor, der feste Boxen liefert (kind wird von der Pipeline überschrieben). */
function detectorReturning(boxes: Omit<DetectedRegion, "kind">[]): RegionDetector {
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

function requestOf(processor: ImageProcessor): ProcessImageRequest {
  return (processor.process as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as ProcessImageRequest;
}

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
    expect(result.report.redacted).toEqual({ face: 2, licensePlate: 0 });
    expect(result.report.output.format).toBe("jpeg");
    // Gesichts-Regionen tragen den aufgelösten Stil "blur".
    expect(requestOf(processor).regions.every((r) => r.style === "blur")).toBe(true);
  });

  it("fragt nur die laut Config aktiven Ziele ab", async () => {
    const face = detectorReturning([box]);
    const plate = detectorReturning([box]);
    // Kennzeichen AUS: der Plate-Detektor darf nicht laufen.
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face, licensePlate: plate },
      processor: okProcessor(),
    });

    await sanitize({ imageUri: "file://raw.jpg" });

    expect(face.detect).toHaveBeenCalledOnce();
    expect(plate.detect).not.toHaveBeenCalled();
  });

  it("redigiert Kennzeichen im Stil 'cover', Gesichter im Stil 'blur' (CarForge)", async () => {
    const processor = okProcessor();
    const sanitize = createPhotoSanitizer(
      config({
        faces: { enabled: true, style: "blur" },
        licensePlates: { enabled: true, style: "cover" },
      }),
      {
        detectors: {
          face: detectorReturning([box]),
          licensePlate: detectorReturning([box, box]),
        },
        processor,
      },
    );

    const result = await sanitize({ imageUri: "file://raw.jpg" });

    expect(result.report.redacted).toEqual({ face: 1, licensePlate: 2 });
    const req = requestOf(processor);
    expect(req.regions).toHaveLength(3);
    expect(
      req.regions.filter((r) => r.kind === "licensePlate" && r.style === "cover"),
    ).toHaveLength(2);
    expect(req.regions.filter((r) => r.kind === "face" && r.style === "blur")).toHaveLength(1);
    expect(req.encode).toEqual({ maxEdge: 2048, quality: 0.85 });
  });

  it("strippt auch ohne erkannte Regionen (reines EXIF-Stripping + Re-Enkodierung)", async () => {
    const processor = okProcessor();
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face: detectorReturning([]) },
      processor,
    });

    const result = await sanitize({ imageUri: "file://raw.jpg" });

    expect(result.report.redacted).toEqual({ face: 0, licensePlate: 0 });
    expect(requestOf(processor).regions).toHaveLength(0);
    expect(result.report.metadataStripped).toBe(true);
  });

  it("blockt den Upload, wenn ein aktives Ziel keinen Detektor hat", async () => {
    const sanitize = createPhotoSanitizer(
      config({ licensePlates: { enabled: true, style: "cover" } }),
      {
        detectors: { face: detectorReturning([box]) }, // licensePlate fehlt
        processor: okProcessor(),
      },
    );

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(
      SanitizationError,
    );
  });

  it("blockt den Upload, wenn die Detektion fehlschlägt (kein Rohbild-Fallback)", async () => {
    const processor = okProcessor();
    const failing: RegionDetector = {
      detect: vi.fn(async () => Promise.reject(new Error("boom"))),
    };
    const sanitize = createPhotoSanitizer(config(), { detectors: { face: failing }, processor });

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(
      SanitizationError,
    );
    // Der Prozessor (und damit ein etwaiger Upload) wird gar nicht erst erreicht.
    expect(processor.process).not.toHaveBeenCalled();
  });

  it("blockt den Upload, wenn der Prozessor das Stripping nicht bestätigt", async () => {
    const sanitize = createPhotoSanitizer(config(), {
      detectors: { face: detectorReturning([]) },
      processor: okProcessor({ metadataStripped: false }),
    });

    await expect(sanitize({ imageUri: "file://raw.jpg" })).rejects.toBeInstanceOf(
      SanitizationError,
    );
  });
});

describe("formatSanitizationReport", () => {
  it("fasst Trefferzahlen, Maße/Größe und Metadaten-Status für die On-Screen-Diagnose zusammen", () => {
    const line = formatSanitizationReport({
      metadataStripped: true,
      redacted: { face: 2, licensePlate: 1 },
      output: {
        imageUri: "file://clean.jpg",
        format: "jpeg",
        width: 2048,
        height: 1536,
        bytes: 320_000,
      },
    });

    expect(line).toContain("Gesichter 2");
    expect(line).toContain("Kennzeichen/Text 1");
    expect(line).toContain("2048×1536");
    expect(line).toContain("313 KB"); // 320000 / 1024 gerundet
    expect(line).toContain("EXIF entfernt");
  });
});
