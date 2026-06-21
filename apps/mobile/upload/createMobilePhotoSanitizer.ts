// Setzt die On-Device-**Foto-Sanitisierung** (#89) im RN-Host zusammen: die
// MLKit-Detektoren (permissiv, on-device, **kein gebündeltes Modell**) + der
// Skia-Bildprozessor + die generische Verdrahtung aus der app-shell. Das Ergebnis
// ist der `PhotoSanitizer`, den der Spot-Flow vor dem Persistieren/Upload anwendet
// – schlägt er fehl, geht kein Rohbild raus (harte Vorbedingung).
//
// Detektoren-Strategie (permissiv statt AGPL-YOLO):
//  - Gesichter: MLKit Face Detection (`@infinitered/react-native-mlkit-*`).
//  - Kennzeichen/Text: MLKit Text Recognition (folgt als nächster Schritt; bis
//    dahin ist das Ziel in der Variante aus, damit kein fehlender Detektor den
//    Draft blockiert).
//
// Kategorie-neutral: welche Ziele aktiv sind und wie sie redigiert werden, kommt
// aus `definition.sanitization` (app-shell `createUploadSanitizer`).

import type { RegionDetector, RedactionTargetKind } from "@spotforge/ai-engine";
import { createUploadSanitizer, type PhotoSanitizer } from "@spotforge/app-shell";
import { resolveSanitization, type AppDefinition, type Branding } from "@spotforge/app-config";
import { createSkiaImageProcessor } from "./skiaImageProcessor";
import { createMlkitFaceDetector } from "./mlkitFaceDetector";
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

  const detectors: Partial<Record<RedactionTargetKind, RegionDetector>> = {};
  if (resolved.redact.faces.enabled) {
    detectors.face = await createMlkitFaceDetector({ imageSize: skiaImageSize });
  }
  // Hinweis: `licensePlate` (MLKit-Text-Recognition) folgt als nächster Schritt;
  // ist es in der Variante aktiv, ohne dass hier ein Detektor gebaut wird, blockt
  // die Pipeline den Upload bewusst (harte Vorbedingung) – die Variante hält es
  // daher bis dahin aus.

  const processor = createSkiaImageProcessor({
    cover: {
      label: definition.identity.displayName,
      fillColor: branding.theme.colors.surface,
      textColor: branding.theme.colors.primary,
    },
  });

  return createUploadSanitizer(definition, { detectors, processor });
}
