// Verdrahtet die On-Device-**Foto-Sanitisierung** (`ai-engine.createPhotoSanitizer`)
// mit der Sanitisierungs-Config der aktiven Variante und den vom Host injizierten
// nativen Bausteinen (Detektoren + Bildprozessor). Macht die Sanitisierung zur
// **harten Vorbedingung** des Upload-Pfads (#81/#19): wer ein Karten-Foto
// hochlädt, schickt es zuerst hier durch – schlägt das fehl, wirft die Funktion
// (`SanitizationError`) und es geht **kein** Rohbild raus (Goldene Regel 5).
//
// Reine Wiring-Schicht: alles Variantenspezifische (welche Ziele, Redaktions-Stil,
// Re-Enkodier-Grenzen) stammt aus der `AppDefinition` (`resolveSanitization`) –
// kein hartkodiertes „Kennzeichen". Die nativen Bausteine laufen zur Laufzeit
// über ExecuTorch/Skia und werden – wie das Spot-Wiring – im RN-Build verifiziert.

import {
  createPhotoSanitizer,
  type RedactionTargetKind,
  type ImageProcessor,
  type RegionDetector,
  type SanitizeInput,
  type SanitizeResult,
} from "@spotforge/ai-engine";
import { resolveSanitization, type AppDefinition } from "@spotforge/app-config";

/** Die fertige Sanitisierungs-Funktion: Rohfoto → upload-bereites, bereinigtes Bild. */
export type PhotoSanitizer = (input: SanitizeInput) => Promise<SanitizeResult>;

/** Vom Host bereitzustellende native Bausteine der Sanitisierung. */
export interface UploadSanitizerDeps {
  /**
   * Detektoren je Redaktions-Ziel (`face`, `licensePlate`). Es müssen mindestens die
   * von der Variante aktivierten Ziele abgedeckt sein – sonst blockt die Pipeline den
   * Upload. Synergie mit dem Objekt-Detektor aus #75 (gemeinsame native Infra).
   */
  detectors: Partial<Record<RedactionTargetKind, RegionDetector>>;
  /** Nativer Strip-/Redaktions-/Re-Enkodier-Prozessor (Skia: Blur bzw. Cover). */
  processor: ImageProcessor;
}

/**
 * Baut die Sanitisierungs-Funktion aus der {@link AppDefinition} und den vom Host
 * injizierten nativen Bausteinen. Kategorie-neutral: die Blur-Ziele und
 * Re-Enkodier-Grenzen kommen aus `definition.sanitization` (aufgelöst über
 * {@link resolveSanitization}).
 */
export function createUploadSanitizer(
  definition: AppDefinition,
  deps: UploadSanitizerDeps,
): PhotoSanitizer {
  return createPhotoSanitizer(resolveSanitization(definition), {
    detectors: deps.detectors,
    processor: deps.processor,
  });
}
