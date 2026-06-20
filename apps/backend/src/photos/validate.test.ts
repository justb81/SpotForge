import { describe, expect, it } from "vitest";

import { validateUploadedImage } from "./validate.js";

// Synthetische JPEG-Bytes: nur so viel Struktur wie die Prüfung liest (Marker +
// Längen + SOF-Maße). Kein echtes Bild nötig – wir testen den Header-Scanner.

function u16(n: number): number[] {
  return [(n >> 8) & 0xff, n & 0xff];
}

/** Beliebiges Segment FF<marker> <len:2> <payload>. */
function segment(marker: number, payload: number[]): number[] {
  return [0xff, marker, ...u16(payload.length + 2), ...payload];
}

/** SOF0 (FFC0) mit den gegebenen Maßen, sonst Minimal-Payload. */
function sof0(width: number, height: number): number[] {
  // precision(8) + height + width + 1 Komponente (id, sampling, qtable)
  return segment(0xc0, [8, ...u16(height), ...u16(width), 1, 1, 0x11, 0]);
}

/** Baut ein JPEG: SOI + Segmente + minimaler SOS + EOI. */
function jpeg(...segments: number[][]): Uint8Array {
  const sos = [0xff, 0xda, ...u16(2)]; // SOS-Header (Scan-Daten weggelassen)
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), ...sos, 0xff, 0xd9]);
}

const APP0_JFIF = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00]); // "JFIF\0"
const APP1_EXIF = segment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]); // "Exif\0\0"

describe("validateUploadedImage", () => {
  it("akzeptiert ein sauber re-enkodiertes JPEG (nur SOF) und liest die Maße", () => {
    const result = validateUploadedImage(jpeg(sof0(1920, 1080)));
    expect(result).toEqual({ ok: true, width: 1920, height: 1080, bytes: expect.any(Number) });
  });

  it("akzeptiert ein JPEG mit JFIF (APP0) – kein personenbezogener Inhalt", () => {
    const result = validateUploadedImage(jpeg(APP0_JFIF, sof0(800, 600)));
    expect(result.ok).toBe(true);
  });

  it("lehnt EXIF/GPS-Metadaten ab (APP1)", () => {
    const result = validateUploadedImage(jpeg(APP1_EXIF, sof0(800, 600)));
    expect(result).toEqual({ ok: false, reason: "metadata-present" });
  });

  it("lehnt sonstige APPn-Metadaten ab (z.B. APP2/ICC)", () => {
    const app2 = segment(0xe2, [0x49, 0x43, 0x43]);
    const result = validateUploadedImage(jpeg(app2, sof0(800, 600)));
    expect(result).toEqual({ ok: false, reason: "metadata-present" });
  });

  it("lehnt Kommentar-Segmente ab (COM)", () => {
    const com = segment(0xfe, [0x68, 0x69]); // "hi"
    const result = validateUploadedImage(jpeg(com, sof0(800, 600)));
    expect(result).toEqual({ ok: false, reason: "metadata-present" });
  });

  it("lehnt Nicht-JPEG ab (z.B. PNG-Magie)", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(validateUploadedImage(png)).toEqual({ ok: false, reason: "not-jpeg" });
  });

  it("lehnt zu große Dateien ab", () => {
    const big = jpeg(sof0(800, 600));
    const result = validateUploadedImage(big, { maxEdge: 2048, maxBytes: 4 });
    expect(result).toEqual({ ok: false, reason: "too-large" });
  });

  it("lehnt zu große Kantenlängen ab", () => {
    const result = validateUploadedImage(jpeg(sof0(5000, 600)), { maxEdge: 2048, maxBytes: 1e7 });
    expect(result).toEqual({ ok: false, reason: "dimensions-exceeded" });
  });

  it("lehnt ein JPEG ohne SOF (keine Maße) als korrupt ab", () => {
    const result = validateUploadedImage(jpeg(APP0_JFIF));
    expect(result).toEqual({ ok: false, reason: "corrupt" });
  });

  it("lehnt abgeschnittene Bytes als korrupt ab", () => {
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00]);
    expect(validateUploadedImage(truncated)).toEqual({ ok: false, reason: "corrupt" });
  });
});
