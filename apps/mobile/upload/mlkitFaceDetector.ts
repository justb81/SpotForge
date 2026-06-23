// MLKit-Gesichtsdetektor der Foto-Sanitisierung (#89) – permissiv, on-device, kein
// gebündeltes Modell. Über `@infinitered/react-native-mlkit-face-detection` (ein
// **Expo-Modul** → New-Architecture-/Bridgeless-tauglich). Erfüllt den ai-engine-
// `RegionDetector`-Seam: Foto-URI → normalisierte {@link DetectedRegion}en.
//
// MLKit liefert die Box in **Quellbild-Pixeln** (`frame.origin`/`frame.size`);
// daraus rechnen wir über die (via Skia gelesene) Bildgröße auf 0..1 um, damit der
// Skia-Prozessor auflösungsunabhängig blurrt.

import { RNMLKitFaceDetector } from "@infinitered/react-native-mlkit-face-detection";
import type { DetectedRegion, RegionDetector } from "@spotforge/ai-engine";
import { normalizeRect } from "./regions";

export interface MlkitFaceDetectorOptions {
  /** Liefert die Pixel-Maße des Quellbildes (z.B. via Skia). */
  imageSize: (uri: string) => Promise<{ width: number; height: number }>;
}

/**
 * Baut einen Gesichts-{@link RegionDetector} über MLKit. Initialisiert den Detektor
 * einmal (recall-lastig: `performanceMode "accurate"`, kleine `minFaceSize`, damit
 * auch kleine Passantengesichter erfasst werden – ein verpasstes Gesicht wäre ein
 * Privacy-Leak). Eine leere Trefferliste ist kein Fehler.
 */
export async function createMlkitFaceDetector(
  options: MlkitFaceDetectorOptions,
): Promise<RegionDetector> {
  // `deferInitialization: true` → der Konstruktor initialisiert NICHT von selbst
  // (sonst liefe eine zweite, nicht-awaitbare Initialisierung als Race); wir
  // initialisieren stattdessen kontrolliert und awaitbar.
  const detector = new RNMLKitFaceDetector(
    {
      performanceMode: "accurate",
      minFaceSize: 0.05,
    },
    true,
  );
  await detector.initialize();

  return {
    async detect({ imageUri }): Promise<DetectedRegion[]> {
      const result = await detector.detectFaces(imageUri);
      // WICHTIG: Die native Bindung liefert nur `{ faces, imagePath }` – es gibt
      // **kein** `success`/`error`-Feld (die TS-Typen des Pakets sind hier
      // irreführend). Ein Fehler äußert sich als `undefined` (die Detektor-Klasse
      // fängt ihn intern ab) → harte Vorbedingung: werfen statt stillschweigend
      // ohne Gesichts-Blur durchzulassen.
      if (result === undefined) {
        throw new Error("MLKit-Gesichtsdetektion lieferte kein Ergebnis.");
      }
      const faces = result.faces ?? [];
      if (faces.length === 0) return [];
      const { width, height } = await options.imageSize(imageUri);
      // MLKit liefert die Box als origin/size in Quellbild-Pixeln → in Kanten
      // umrechnen und über `normalizeRect` normalisieren (verwirft 0-/NaN-Flächen,
      // damit der Report keine nie-ausgeführte Redaktion behauptet).
      const regions: DetectedRegion[] = [];
      for (const face of faces) {
        const region = normalizeRect(
          {
            left: face.frame.origin.x,
            top: face.frame.origin.y,
            right: face.frame.origin.x + face.frame.size.x,
            bottom: face.frame.origin.y + face.frame.size.y,
          },
          width,
          height,
          "face",
        );
        if (region) regions.push(region);
      }
      return regions;
    },
  };
}
