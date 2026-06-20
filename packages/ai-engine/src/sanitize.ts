/**
 * On-Device-**Foto-Sanitisierung** vor dem Upload (#89, Goldene Regel 5).
 *
 * Karten-Fotos verlassen das Gerät zwangsläufig (Sync #19, Schmiede #76/#81, PvP
 * #20, Tausch #21) und werden anderen Spielern gezeigt. **Bevor** ein Foto
 * hochgeht, wird es hier bereinigt: **alle Metadaten (EXIF/GPS) entfernt** und das
 * Bild neu enkodiert, **Gesichter** und – variantenspezifisch – **Kfz-Kennzeichen**
 * unkenntlich gemacht (geblurrt oder mit dem App-Namen überdeckt, je
 * {@link RedactionStyle}). Schlägt ein nötiger Schritt fehl, **bricht die
 * Sanitisierung ab** (harte Vorbedingung): es wird **nie** ein Rohbild durchgereicht.
 *
 * Kategorie-neutral (Goldene Regel 1/3): **was** unkenntlich gemacht wird und
 * **wie**, kommt aus der aufgelösten {@link ResolvedSanitization} der
 * `AppDefinition` – kein hartkodiertes „Kennzeichen" hier. Die schweren Schritte
 * (Detektion, Strip/Redaktion/Re-Enkodierung) sind injizierte Seams (native
 * ExecuTorch-/Skia-Implementierung im RN-Host, #75-Synergie); die Orchestrierung
 * bleibt rein und ohne RN-Import → vitest-testbar.
 */

import type { RedactionStyle, ResolvedSanitization } from "@spotforge/app-config";

export type { RedactionStyle };

/** Art einer sensiblen Region, die ein Detektor findet (= Redaktions-Ziel). */
export type RedactionTargetKind = "face" | "licensePlate";

/**
 * Normalisierte Bounding-Box (alle Werte 0..1, relativ zur Bildkante) eines
 * erkannten Ziels – damit auflösungsunabhängig und das Herunterskalieren beim
 * Re-Enkodieren überlebend. Ausgabe eines {@link RegionDetector}; den
 * {@link RedactionStyle} legt erst die Pipeline anhand der Config fest.
 */
export interface DetectedRegion {
  kind: RedactionTargetKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Eine zu redigierende Region samt aufgelöstem Stil – Eingabe des Prozessors. */
export interface RedactionRegion extends DetectedRegion {
  /** `"blur"` (weichzeichnen) oder `"cover"` (mit App-Namen in Theme-Farben überdecken). */
  style: RedactionStyle;
}

export interface DetectorInput {
  /** Lokale URI des zu prüfenden Fotos. */
  imageUri: string;
}

/**
 * On-Device-Detektor für **eine** Art sensibler Region. Seam wie {@link Classifier}:
 * die native (ExecuTorch / Plattform-API) Implementierung lebt im RN-Host, hier
 * steht nur der Vertrag. Liefert normalisierte Boxen; eine leere Liste bedeutet
 * „nichts gefunden" (kein Fehler).
 */
export interface RegionDetector {
  detect(input: DetectorInput): Promise<DetectedRegion[]>;
}

/** Auftrag an den nativen Bildprozessor: strippen, redigieren, re-enkodieren. */
export interface ProcessImageRequest {
  imageUri: string;
  /** Zu redigierende Regionen samt Stil. Leer ⇒ nur strippen + re-enkodieren. */
  regions: RedactionRegion[];
  /** Re-Enkodier-Grenzen aus der Variante ({@link ResolvedSanitization.encode}). */
  encode: ResolvedSanitization["encode"];
}

/** Ergebnis der nativen Verarbeitung: ein frisch enkodiertes, metadatenfreies Bild. */
export interface ProcessedImage {
  /** URI des sanitisierten Bildes (neue Datei). */
  imageUri: string;
  /** Ausgabeformat – immer ein verlustbehaftet re-enkodiertes JPEG (kein Metadaten-Container). */
  format: "jpeg";
  width: number;
  height: number;
  bytes: number;
  /**
   * Bestätigt, dass beim Re-Enkodieren **alle** Metadaten (EXIF/GPS/…) entfernt
   * wurden. Muss `true` sein – sonst bricht die Sanitisierung ab (harte
   * Vorbedingung, kein Upload des Rohbilds).
   */
  metadataStripped: boolean;
}

/**
 * Nativer Bildprozessor (Seam): entfernt **alle** Metadaten, redigiert die
 * übergebenen Regionen (Blur oder Cover) und re-enkodiert auf die Grenzen.
 * Implementierung im RN-Host (Skia); hier nur der Vertrag, damit die
 * Orchestrierung RN-frei und testbar bleibt.
 */
export interface ImageProcessor {
  process(request: ProcessImageRequest): Promise<ProcessedImage>;
}

/** Injizierte Abhängigkeiten der Sanitisierung (alle mockbar). */
export interface SanitizeDeps {
  /**
   * Detektoren je Redaktions-Ziel. Es werden **nur** die laut Config aktiven Ziele
   * abgefragt; fehlt ein für die Config nötiger Detektor, bricht die
   * Sanitisierung ab (harte Vorbedingung – lieber kein Upload als ein
   * un-redigiertes Bild).
   */
  detectors: Partial<Record<RedactionTargetKind, RegionDetector>>;
  /** Nativer Strip-/Redaktions-/Re-Enkodier-Prozessor. */
  processor: ImageProcessor;
}

export interface SanitizeInput {
  /** Lokale URI des aufgenommenen Rohfotos. */
  imageUri: string;
}

/**
 * Nachweis dessen, was die Sanitisierung getan hat – dient dem Upload-Gate
 * (#81/#19: „kein Upload ohne erfolgte Bereinigung") und der Transparenz/Logs.
 * `metadataStripped` ist als `true` typisiert: ein {@link SanitizeResult} existiert
 * nur, wenn das Stripping bestätigt wurde.
 */
export interface SanitizationReport {
  metadataStripped: true;
  /** Anzahl redigierter Regionen je Ziel (nur aktive Ziele > 0). */
  redacted: Record<RedactionTargetKind, number>;
  output: { imageUri: string; format: "jpeg"; width: number; height: number; bytes: number };
}

/** Erfolgreiche Sanitisierung: das upload-bereite Bild + sein {@link SanitizationReport}. */
export interface SanitizeResult {
  /** URI des sanitisierten, upload-bereiten Bildes. */
  imageUri: string;
  report: SanitizationReport;
}

/**
 * Fehler der Sanitisierung. Wird geworfen, wann immer ein nötiger Schritt
 * fehlschlägt – der Aufrufer (Upload-Pfad) **blockt** daraufhin den Upload, statt
 * stillschweigend das Rohbild zu senden.
 */
export class SanitizationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SanitizationError";
  }
}

/** Aktive Redaktions-Ziele (enabled) in fester Reihenfolge, mit aufgelöstem Stil. */
function activeTargets(
  config: ResolvedSanitization,
): { kind: RedactionTargetKind; style: RedactionStyle }[] {
  // Detektions-Art (Singular) ↔ Config-Schlüssel (Plural).
  const targets: [RedactionTargetKind, ResolvedSanitization["redact"]["faces"]][] = [
    ["face", config.redact.faces],
    ["licensePlate", config.redact.licensePlates],
  ];
  return targets
    .filter(([, redaction]) => redaction.enabled)
    .map(([kind, redaction]) => ({ kind, style: redaction.style }));
}

/**
 * Baut die Sanitisierungs-Funktion: Rohfoto → {@link SanitizeResult}. Verkettet
 * Detektion (je aktivem Ziel) → nativer Strip/Redaktions/Re-Enkodier-Schritt →
 * Prüfung der harten Vorbedingung (Metadaten wirklich entfernt). Jeder Fehler wird
 * zu einer {@link SanitizationError} – es gibt **keinen** Fallback auf das Rohbild.
 */
export function createPhotoSanitizer(
  config: ResolvedSanitization,
  deps: SanitizeDeps,
): (input: SanitizeInput) => Promise<SanitizeResult> {
  const targets = activeTargets(config);

  return async function sanitize(input: SanitizeInput): Promise<SanitizeResult> {
    // 1) Aktive Detektoren laufen lassen. Jedes aktive Ziel braucht einen Detektor;
    //    fehlt er, ist das eine Fehlkonfiguration → Abbruch (kein un-redigiertes Bild).
    const regions: RedactionRegion[] = [];
    const redacted: Record<RedactionTargetKind, number> = { face: 0, licensePlate: 0 };
    for (const { kind, style } of targets) {
      const detector = deps.detectors[kind];
      if (detector === undefined) {
        throw new SanitizationError(
          `Kein Detektor für aktives Redaktions-Ziel "${kind}" – Upload blockiert (harte Vorbedingung, #89).`,
        );
      }
      let found: DetectedRegion[];
      try {
        found = await detector.detect({ imageUri: input.imageUri });
      } catch (cause) {
        throw new SanitizationError(`Detektion für "${kind}" fehlgeschlagen.`, { cause });
      }
      for (const region of found) {
        // Auf das angefragte Ziel normieren und den Config-Stil anheften.
        regions.push({ ...region, kind, style });
        redacted[kind] += 1;
      }
    }

    // 2) Nativer Strip-/Redaktions-/Re-Enkodier-Schritt. Entfernt IMMER alle Metadaten –
    //    auch wenn keine Region zu redigieren ist (reines EXIF-Stripping + Re-Enkodierung).
    let processed: ProcessedImage;
    try {
      processed = await deps.processor.process({
        imageUri: input.imageUri,
        regions,
        encode: config.encode,
      });
    } catch (cause) {
      throw new SanitizationError(
        "Bildverarbeitung (Strip/Redaktion/Re-Enkodierung) fehlgeschlagen.",
        { cause },
      );
    }

    // 3) Harte Vorbedingung: ohne bestätigtes Metadaten-Stripping kein Upload.
    if (!processed.metadataStripped) {
      throw new SanitizationError(
        "Metadaten wurden nicht entfernt – Upload des Rohbilds wird verhindert.",
      );
    }

    return {
      imageUri: processed.imageUri,
      report: {
        metadataStripped: true,
        redacted,
        output: {
          imageUri: processed.imageUri,
          format: processed.format,
          width: processed.width,
          height: processed.height,
          bytes: processed.bytes,
        },
      },
    };
  };
}
