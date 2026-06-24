import { z } from "zod";

// Geteilter Vertrag für **Foto-Uploads** (#89). Karten-Fotos werden on-device
// sanitisiert (EXIF/GPS entfernt + re-enkodiert, Gesichter/Kennzeichen geblurrt,
// `@spotforge/ai-engine`), bevor sie hochgehen. Diese Constraints sind die
// **server-seitige Absicherung** (defense-in-depth, Goldene Regel 5): der Server
// weist nicht-konforme Uploads ab – dieselben Grenzen, die der Client einhält.

/**
 * Akzeptierte Upload-Grenzen. Bewusst eng: nur frisch re-enkodiertes JPEG, eine
 * Obergrenze für Kantenlänge und Bytes. `maxEdge` deckt sich mit dem Default der
 * Client-Re-Enkodierung (`@spotforge/app-config` `DEFAULT_SANITIZATION`).
 */
export const PHOTO_UPLOAD_CONSTRAINTS = {
  /** Einziges erlaubtes Format – ein Re-Enkodierungs-Container ohne Metadaten-Felder. */
  format: "jpeg",
  /** Maximale Kantenlänge (längere Seite) in px. */
  maxEdge: 2048,
  /** Maximale Dateigröße in Bytes (8 MiB). */
  maxBytes: 8 * 1024 * 1024,
} as const;

export const photoConstraintsSchema = z.object({
  format: z.literal("jpeg"),
  maxEdge: z.number().int().positive(),
  maxBytes: z.number().int().positive(),
});
export type PhotoConstraints = z.infer<typeof photoConstraintsSchema>;

/**
 * Gründe, aus denen der Server einen Foto-Upload ablehnt. Geteilt, damit der
 * Client die Ablehnung strukturiert behandeln kann (statt nur HTTP 400).
 */
export const PHOTO_REJECTION_REASONS = [
  /** Kein JPEG (fehlende/kaputte SOI-Magie). */
  "not-jpeg",
  /** Restmetadaten gefunden (EXIF/XMP/APPn/Kommentar) – nicht sanitisiert. */
  "metadata-present",
  /** Datei größer als {@link PHOTO_UPLOAD_CONSTRAINTS.maxBytes}. */
  "too-large",
  /** Kantenlänge über {@link PHOTO_UPLOAD_CONSTRAINTS.maxEdge}. */
  "dimensions-exceeded",
  /** Bytes ergeben kein wohlgeformtes JPEG. */
  "corrupt",
] as const;
export const photoRejectionReasonSchema = z.enum(PHOTO_REJECTION_REASONS);
export type PhotoRejectionReason = z.infer<typeof photoRejectionReasonSchema>;

/** Antwortkörper bei abgelehntem Upload (HTTP 400). */
export const photoRejectionSchema = z.object({
  error: z.literal("photo-rejected"),
  reason: photoRejectionReasonSchema,
});
export type PhotoRejection = z.infer<typeof photoRejectionSchema>;
