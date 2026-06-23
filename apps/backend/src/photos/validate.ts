import { PHOTO_UPLOAD_CONSTRAINTS, type PhotoRejectionReason } from "@spotforge/api-contract";

// **Server-seitige Absicherung** der Foto-Sanitisierung (#89, defense-in-depth,
// Goldene Regel 5). Der Client sanitisiert on-device (`@spotforge/ai-engine`:
// EXIF/GPS entfernen + re-enkodieren, Blur); der Server **vertraut dem nicht
// blind**, sondern prüft die Rohbytes vor dem Speichern:
//
//  - Es muss ein JPEG sein (SOI-Magie),
//  - es darf **keine** Restmetadaten enthalten (EXIF/XMP via APP1, sonstige APPn,
//    Kommentare) – ein sauber re-enkodiertes Bild hat höchstens JFIF (APP0),
//  - Kantenlänge und Bytes innerhalb der geteilten Constraints.
//
// Nicht-konforme Uploads werden abgewiesen (kein stillschweigendes Akzeptieren
// eines Rohbilds). Reine, I/O-freie Logik → unter vitest direkt testbar.

/** Ergebnis der Prüfung: akzeptiert (mit Maßen) oder abgelehnt (mit Grund). */
export type PhotoValidationResult =
  | { ok: true; width: number; height: number; bytes: number }
  | { ok: false; reason: PhotoRejectionReason };

// JPEG-Marker (jeweils das Byte nach 0xFF).
const SOI = 0xd8; // Start of Image
const EOI = 0xd9; // End of Image
const SOS = 0xda; // Start of Scan (danach folgen entropie-kodierte Bilddaten)
const APP0 = 0xe0; // JFIF – einziges erlaubtes APP-Segment (kein personenbezogener Inhalt)
const APP2 = 0xe2; // ICC-Farbprofil (sRGB) – erlaubt, wenn es ein echtes ICC-Profil ist
const APP15 = 0xef; // APP1..APP15 (EXIF/XMP/…) tragen Metadaten → ablehnen (außer APP2-ICC)
const COM = 0xfe; // Kommentar-Segment → ablehnen
const TEM = 0x01; // standalone, ohne Länge

// „ICC_PROFILE\0" – Kennzeichen am Anfang eines APP2-ICC-Segments.
const ICC_PROFILE_MARKER = [
  0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f, 0x46, 0x49, 0x4c, 0x45, 0x00,
] as const;

/** Beginnt die APP2-Nutzlast ab `payloadStart` mit dem „ICC_PROFILE\0"-Kennzeichen? */
function isIccProfile(bytes: Uint8Array, payloadStart: number): boolean {
  for (let k = 0; k < ICC_PROFILE_MARKER.length; k += 1) {
    if (bytes[payloadStart + k] !== ICC_PROFILE_MARKER[k]) return false;
  }
  return true;
}

/** Liest ein Big-Endian-uint16 ab `idx`; `undefined`, wenn die Bytes fehlen. */
function u16At(bytes: Uint8Array, idx: number): number | undefined {
  const hi = bytes[idx];
  const lo = bytes[idx + 1];
  if (hi === undefined || lo === undefined) return undefined;
  return (hi << 8) | lo;
}

/** Standalone-Marker ohne Längenfeld (Restart-Marker RST0..RST7). */
function isStandalone(marker: number): boolean {
  return marker === TEM || (marker >= 0xd0 && marker <= 0xd7);
}

/**
 * Überspringt die entropie-kodierten Scan-Daten nach einem SOS bis zum nächsten
 * echten Segment-Marker. Byte-Stuffing (`0xFF00`) und Restart-Marker
 * (`0xFFD0..D7`) gehören zu den Scan-Daten und werden übersprungen. Liefert den
 * Index des nächsten `0xFF`-Markers bzw. `bytes.length`, wenn keiner mehr folgt.
 * So scannt die Prüfung **über das erste SOS hinaus** weiter – ein nicht-
 * kooperierender Client könnte Metadaten hinter den Scan-Daten anhängen.
 */
function skipEntropyData(bytes: Uint8Array, from: number): number {
  let i = from;
  while (i < bytes.length) {
    if (bytes[i] === 0xff) {
      const next = bytes[i + 1];
      if (next === undefined) return bytes.length;
      if (next !== 0x00 && !(next >= 0xd0 && next <= 0xd7)) return i;
    }
    i += 1;
  }
  return bytes.length;
}

/**
 * Start-of-Frame-Marker, die die Bilddimensionen tragen (alle SOFn außer DHT
 * 0xC4, JPG 0xC8 und DAC 0xCC). Payload: [precision][height:2][width:2][…].
 */
function isStartOfFrame(marker: number): boolean {
  if (marker < 0xc0 || marker > 0xcf) return false;
  return marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/**
 * Prüft die Rohbytes eines hochgeladenen Fotos gegen die Sanitisierungs-/Format-
 * Constraints (#89). Liefert bei Erfolg die ausgelesenen Maße, sonst den
 * Ablehnungsgrund. Die Grenzen sind die in `@spotforge/api-contract` geteilten
 * {@link PHOTO_UPLOAD_CONSTRAINTS} (überschreibbar für Tests).
 */
export function validateUploadedImage(
  bytes: Uint8Array,
  constraints: { maxEdge: number; maxBytes: number } = PHOTO_UPLOAD_CONSTRAINTS,
): PhotoValidationResult {
  if (bytes.length > constraints.maxBytes) return { ok: false, reason: "too-large" };

  // SOI: ein JPEG beginnt mit 0xFFD8.
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== SOI) {
    return { ok: false, reason: "not-jpeg" };
  }

  let i = 2;
  let width: number | undefined;
  let height: number | undefined;

  while (i < bytes.length) {
    // Jeder Segment-Marker beginnt mit 0xFF; Füll-Bytes (0xFF) werden übersprungen.
    if (bytes[i] !== 0xff) return { ok: false, reason: "corrupt" };
    let marker = bytes[i + 1];
    while (marker === 0xff && i + 1 < bytes.length) {
      i += 1;
      marker = bytes[i + 1];
    }
    if (marker === undefined) return { ok: false, reason: "corrupt" };
    i += 2;

    // EOI beendet das Bild.
    if (marker === EOI) break;
    if (isStandalone(marker)) continue;

    // Längenfeld (Big-Endian, schließt die zwei Längen-Bytes selbst ein).
    const segLen = u16At(bytes, i);
    if (segLen === undefined || segLen < 2 || i + segLen > bytes.length) {
      return { ok: false, reason: "corrupt" };
    }

    // SOS: Nach dem (gelängten) Scan-Header folgen entropie-kodierte Bilddaten.
    // Nicht am ersten SOS aufhören (das wäre eine Defense-in-Depth-Lücke: ein
    // nicht-kooperierender Client könnte Metadaten dahinter anhängen), sondern die
    // Scan-Daten überspringen und **weiterscannen**.
    if (marker === SOS) {
      i = skipEntropyData(bytes, i + segLen);
      continue;
    }

    // Metadaten-Segmente ablehnen: alle APPn außer APP0/JFIF und Kommentare.
    // Ausnahme: APP2 mit **ICC-Farbprofil** (sRGB) – das schreibt Skias JPEG-Encoder
    // mit, es trägt keine personenbezogenen Daten (erkennbar am „ICC_PROFILE\0"-
    // Kennzeichen am Payload-Anfang, i+2 nach den zwei Längen-Bytes).
    if ((marker > APP0 && marker <= APP15) || marker === COM) {
      if (marker === APP2 && isIccProfile(bytes, i + 2)) {
        i += segLen;
        continue;
      }
      return { ok: false, reason: "metadata-present" };
    }

    if (isStartOfFrame(marker)) {
      // Payload nach den zwei Längen-Bytes: [precision][height:2][width:2][…].
      // SOF-Nutzlast ist mind. 6 Bytes (precision+H+W) → segLen ≥ 8, sonst läsen
      // wir die Maße aus dem Folgesegment statt aus dem SOF.
      if (segLen < 8) return { ok: false, reason: "corrupt" };
      height = u16At(bytes, i + 3);
      width = u16At(bytes, i + 5);
      if (height === undefined || width === undefined) return { ok: false, reason: "corrupt" };
    }

    i += segLen;
  }

  if (width === undefined || height === undefined) return { ok: false, reason: "corrupt" };
  if (width > constraints.maxEdge || height > constraints.maxEdge) {
    return { ok: false, reason: "dimensions-exceeded" };
  }

  return { ok: true, width, height, bytes: bytes.length };
}
