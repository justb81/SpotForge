/**
 * On-Device-**Foto-Sanitisierung** vor dem Upload (#89, Goldene Regel 5).
 *
 * Karten-Fotos verlassen das Gerät zwangsläufig (Sync #19, Schmiede #76/#81, PvP
 * #20, Tausch #21) und werden anderen Spielern gezeigt. **Bevor** ein Foto
 * hochgeht, wird es hier bereinigt: **alle Metadaten (EXIF/GPS) entfernt** und das
 * Bild neu enkodiert, **Gesichter** und – variantenspezifisch – **Kfz-Kennzeichen**
 * geblurrt. Schlägt ein nötiger Schritt fehl, **bricht die Sanitisierung ab**
 * (harte Vorbedingung): es wird **nie** ein Rohbild durchgereicht.
 *
 * Kategorie-neutral (Goldene Regel 1/3): **was** geblurrt wird, kommt aus der
 * aufgelösten {@link ResolvedSanitization} der `AppDefinition` – kein hartkodiertes
 * „Kennzeichen" hier. Die schweren Schritte (Detektion, Strip/Blur/Re-Enkodierung)
 * sind injizierte Seams (native ExecuTorch-/Plattform-Implementierung im RN-Host,
 * #75-Synergie); die Orchestrierung bleibt rein und ohne RN-Import → vitest-testbar.
 */

import type { ResolvedSanitization } from "@spotforge/app-config";

/** Art einer sensiblen Region, die ein Detektor findet (= Blur-Ziel). */
export type BlurTargetKind = "face" | "licensePlate";

/**
 * Normalisierte Bounding-Box (alle Werte 0..1, relativ zur Bildkante) – damit ist
 * sie auflösungsunabhängig und überlebt das Herunterskalieren beim Re-Enkodieren.
 */
export interface BlurRegion {
  kind: BlurTargetKind;
  x: number;
  y: number;
  width: number;
  height: number;
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
  detect(input: DetectorInput): Promise<BlurRegion[]>;
}

/** Auftrag an den nativen Bildprozessor: strippen, blurren, re-enkodieren. */
export interface ProcessImageRequest {
  imageUri: string;
  /** Zu blurrende Regionen (normalisiert). Leer ⇒ nur strippen + re-enkodieren. */
  blurRegions: BlurRegion[];
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
 * Nativer Bildprozessor (Seam): entfernt **alle** Metadaten, blurrt die
 * übergebenen Regionen und re-enkodiert auf die Grenzen. Implementierung im
 * RN-Host (z.B. `expo-image-manipulator` + nativer Blur); hier nur der Vertrag,
 * damit die Orchestrierung RN-frei und testbar bleibt.
 */
export interface ImageProcessor {
  process(request: ProcessImageRequest): Promise<ProcessedImage>;
}

/** Injizierte Abhängigkeiten der Sanitisierung (alle mockbar). */
export interface SanitizeDeps {
  /**
   * Detektoren je Blur-Ziel. Es werden **nur** die laut Config aktiven Ziele
   * abgefragt; fehlt ein für die Config nötiger Detektor, bricht die
   * Sanitisierung ab (harte Vorbedingung – lieber kein Upload als ein
   * un-geblurrtes Bild).
   */
  detectors: Partial<Record<BlurTargetKind, RegionDetector>>;
  /** Nativer Strip-/Blur-/Re-Enkodier-Prozessor. */
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
  /** Anzahl geblurrter Regionen je Ziel (nur aktive Ziele > 0). */
  blurred: Record<BlurTargetKind, number>;
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

/** Leitet aus der Config die Reihenfolge der aktiven Blur-Ziele ab. */
function activeTargets(config: ResolvedSanitization): BlurTargetKind[] {
  const targets: BlurTargetKind[] = [];
  if (config.blur.faces) targets.push("face");
  if (config.blur.licensePlates) targets.push("licensePlate");
  return targets;
}

/**
 * Baut die Sanitisierungs-Funktion: Rohfoto → {@link SanitizeResult}. Verkettet
 * Detektion (je aktivem Ziel) → nativer Strip/Blur/Re-Enkodier-Schritt → Prüfung
 * der harten Vorbedingung (Metadaten wirklich entfernt). Jeder Fehler wird zu
 * einer {@link SanitizationError} – es gibt **keinen** Fallback auf das Rohbild.
 */
export function createPhotoSanitizer(
  config: ResolvedSanitization,
  deps: SanitizeDeps,
): (input: SanitizeInput) => Promise<SanitizeResult> {
  const targets = activeTargets(config);

  return async function sanitize(input: SanitizeInput): Promise<SanitizeResult> {
    // 1) Aktive Detektoren laufen lassen. Jedes aktive Ziel braucht einen Detektor;
    //    fehlt er, ist das eine Fehlkonfiguration → Abbruch (kein un-geblurrtes Bild).
    const regions: BlurRegion[] = [];
    const blurred: Record<BlurTargetKind, number> = { face: 0, licensePlate: 0 };
    for (const kind of targets) {
      const detector = deps.detectors[kind];
      if (detector === undefined) {
        throw new SanitizationError(
          `Kein Detektor für aktives Blur-Ziel "${kind}" – Upload blockiert (harte Vorbedingung, #89).`,
        );
      }
      let found: BlurRegion[];
      try {
        found = await detector.detect({ imageUri: input.imageUri });
      } catch (cause) {
        throw new SanitizationError(`Detektion für "${kind}" fehlgeschlagen.`, { cause });
      }
      for (const region of found) {
        // Auf das angefragte Ziel normieren – der Detektor kennt nur seine eigene Art.
        regions.push({ ...region, kind });
        blurred[kind] += 1;
      }
    }

    // 2) Nativer Strip-/Blur-/Re-Enkodier-Schritt. Entfernt IMMER alle Metadaten –
    //    auch wenn keine Region zu blurren ist (reines EXIF-Stripping + Re-Enkodierung).
    let processed: ProcessedImage;
    try {
      processed = await deps.processor.process({
        imageUri: input.imageUri,
        blurRegions: regions,
        encode: config.encode,
      });
    } catch (cause) {
      throw new SanitizationError("Bildverarbeitung (Strip/Blur/Re-Enkodierung) fehlgeschlagen.", {
        cause,
      });
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
        blurred,
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
