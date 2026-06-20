// Setzt die On-Device-**Foto-Sanitisierung** (#89) im RN-Host zusammen: die
// gebündelten Detektor-Modelle (Gesicht/Kennzeichen) + der Skia-Bildprozessor +
// die generische Verdrahtung aus der app-shell. Das Ergebnis ist der
// `PhotoSanitizer`, den der Upload-Pfad (#81/#19) **vor** jedem Foto-Upload
// aufruft – schlägt er fehl, geht kein Rohbild raus (harte Vorbedingung).
//
// Kategorie-neutral: welche Ziele aktiv sind und wie sie redigiert werden, kommt
// aus `definition.sanitization` (app-shell `createUploadSanitizer`); der
// `"cover"`-Text/-Farben kommen aus Identität + Branding der aktiven Variante.

import {
  createRegionDetector,
  type RegionDetector,
  type RegionDetectorModel,
  type RedactionTargetKind,
} from "@spotforge/ai-engine";
import { createUploadSanitizer, type PhotoSanitizer } from "@spotforge/app-shell";
import type { AppDefinition, Branding } from "@spotforge/app-config";
import { createSkiaImageProcessor } from "./skiaImageProcessor";
import { skiaImageSize } from "./imageSize";

export interface MobilePhotoSanitizerOptions {
  definition: AppDefinition;
  branding: Branding;
  /**
   * Gebündelte Detektor-Modelle (face / license_plate) als Metro-Assets
   * (`tools/fetch-models` → `.pte`, ADR 0008). Es müssen mindestens die laut
   * `definition.sanitization` aktiven Ziele abgedeckt sein – sonst blockt die
   * Pipeline den Upload.
   */
  detectorModels: RegionDetectorModel[];
}

/**
 * Baut den {@link PhotoSanitizer} der aktiven Variante. Lädt je Detektor-Modell
 * einen ExecuTorch-Regionen-Detektor (Bildmaße via Skia) und gibt sie zusammen mit
 * dem Skia-Prozessor an die generische {@link createUploadSanitizer}-Verdrahtung.
 * Der `"cover"`-Stil schreibt den App-Namen in den Theme-Farben (surface ⊕ primary).
 */
export async function createMobilePhotoSanitizer(
  options: MobilePhotoSanitizerOptions,
): Promise<PhotoSanitizer> {
  const { definition, branding, detectorModels } = options;

  const detectors: Partial<Record<RedactionTargetKind, RegionDetector>> = {};
  for (const model of detectorModels) {
    detectors[model.targetKind] = await createRegionDetector(model, { imageSize: skiaImageSize });
  }

  const processor = createSkiaImageProcessor({
    cover: {
      label: definition.identity.displayName,
      fillColor: branding.theme.colors.surface,
      textColor: branding.theme.colors.primary,
    },
  });

  return createUploadSanitizer(definition, { detectors, processor });
}
