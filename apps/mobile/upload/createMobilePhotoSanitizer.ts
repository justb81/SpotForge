// Setzt die On-Device-**Foto-Sanitisierung** (#89) im RN-Host zusammen: die
// MLKit-Detektoren (permissiv, on-device, **kein gebündeltes Modell**) + der
// Skia-Bildprozessor + die generische Verdrahtung aus der app-shell. Das Ergebnis
// ist der `PhotoSanitizer`, den der Spot-Flow vor dem Persistieren/Upload anwendet
// – schlägt er fehl, geht kein Rohbild raus (harte Vorbedingung).
//
// Detektoren-Strategie (permissiv statt AGPL-YOLO):
//  - Gesichter: MLKit Face Detection (`@infinitered/react-native-mlkit-*`).
//  - Kennzeichen/Text: MLKit Text Recognition (OCR → jede lesbare Textzeile wird
//    redigiert; deckt Kennzeichen kategorie-neutral mit ab).
//
// Kategorie-neutral: welche Ziele aktiv sind und wie sie redigiert werden, kommt
// aus `definition.sanitization` (app-shell `createUploadSanitizer`).

import type { RegionDetector, RedactionTargetKind } from "@spotforge/ai-engine";
import { createUploadSanitizer, type PhotoSanitizer } from "@spotforge/app-shell";
import { resolveSanitization, type AppDefinition, type Branding } from "@spotforge/app-config";
import { createSkiaImageProcessor } from "./skiaImageProcessor";
import { createMlkitFaceDetector } from "./mlkitFaceDetector";
import { createMlkitTextDetector } from "./mlkitTextDetector";
import { skiaImageSize } from "./imageSize";

export interface MobilePhotoSanitizerOptions {
  definition: AppDefinition;
  branding: Branding;
}

/**
 * Baut den {@link PhotoSanitizer} der aktiven Variante: MLKit-Detektoren für die
 * laut `definition.sanitization` aktiven Ziele + Skia-Prozessor, verdrahtet über
 * {@link createUploadSanitizer}. Es werden nur Detektoren für **aktive** Ziele
 * gebaut (kein unnötiges Modell-Laden); der `"cover"`-Stil schreibt den App-Namen
 * in den Theme-Farben (surface ⊕ primary).
 */
export async function createMobilePhotoSanitizer(
  options: MobilePhotoSanitizerOptions,
): Promise<PhotoSanitizer> {
  const { definition, branding } = options;
  const resolved = resolveSanitization(definition);

  // Bildmaße je URI memoisieren: Gesichts- und Text-Detektor lesen sonst dieselbe
  // Datei jeweils separat über Skia (zusätzlicher Dekodier-Aufwand pro Spot).
  // Spots laufen sequentiell → ein kleiner Cache der letzten Einträge genügt.
  const sizeCache = new Map<string, { width: number; height: number }>();
  const imageSize = async (uri: string): Promise<{ width: number; height: number }> => {
    const cached = sizeCache.get(uri);
    if (cached) return cached;
    const size = await skiaImageSize(uri);
    sizeCache.set(uri, size);
    if (sizeCache.size > 8) {
      const oldest = sizeCache.keys().next().value;
      if (oldest !== undefined) sizeCache.delete(oldest);
    }
    return size;
  };

  const detectors: Partial<Record<RedactionTargetKind, RegionDetector>> = {};
  if (resolved.redact.faces.enabled) {
    detectors.face = await createMlkitFaceDetector({ imageSize });
  }
  if (resolved.redact.licensePlates.enabled) {
    // MLKit Text Recognition (OCR): redigiert jede lesbare Textzeile und deckt damit
    // Kennzeichen kategorie-neutral mit ab. Kein `initialize()` nötig (`recognizeText`
    // ist zustandslos), daher synchron gebaut.
    detectors.licensePlate = createMlkitTextDetector({ imageSize });
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
