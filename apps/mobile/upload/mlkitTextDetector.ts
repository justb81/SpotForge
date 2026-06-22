// MLKit-**Text**-Detektor der Foto-Sanitisierung (#89) – permissiv, on-device, kein
// gebündeltes Modell. Über `@infinitered/react-native-mlkit-text-recognition` (ein
// **Expo-Modul** → New-Architecture-/Bridgeless-tauglich). Erfüllt den ai-engine-
// `RegionDetector`-Seam: Foto-URI → normalisierte {@link DetectedRegion}en.
//
// Strategie „OCR → alles Lesbare abdecken": MLKit erkennt **keine** Kennzeichen als
// solche, sondern Text. Für die Privatsphäre redigieren wir daher **jede erkannte
// Textzeile** (Kennzeichen, Aufkleber, Straßenschilder, Namen am Klingelschild …) –
// das deckt Kennzeichen sicher mit ab, ohne kategorie-spezifische Annahme (Goldene
// Regel 1/3). MLKit liefert die Box in **Quellbild-Pixeln** (`left/top/right/bottom`);
// daraus rechnen wir über die (via Skia gelesene) Bildgröße auf 0..1 um.

import { recognizeText, type Rect } from "@infinitered/react-native-mlkit-text-recognition";
import type { DetectedRegion, RegionDetector } from "@spotforge/ai-engine";

export interface MlkitTextDetectorOptions {
  /** Liefert die Pixel-Maße des Quellbildes (z.B. via Skia) – für die Box-Normalisierung. */
  imageSize: (uri: string) => Promise<{ width: number; height: number }>;
}

/**
 * Baut einen Text-{@link RegionDetector} über MLKit Text Recognition. Redigiert wird
 * auf **Zeilen**-Granularität (enger als Blöcke, fängt aber jede lesbare Stelle) –
 * ein verpasster Text wäre ein Privacy-Leak. Eine leere Trefferliste ist kein Fehler.
 */
export function createMlkitTextDetector(options: MlkitTextDetectorOptions): RegionDetector {
  return {
    async detect({ imageUri }): Promise<DetectedRegion[]> {
      const result = await recognizeText(imageUri);
      if (result.blocks.length === 0) return [];
      const { width, height } = await options.imageSize(imageUri);
      const regions: DetectedRegion[] = [];
      for (const block of result.blocks) {
        // Zeilen, wenn vorhanden; sonst der Block selbst (Fallback, falls leer).
        const lines = block.lines.length > 0 ? block.lines : [block];
        for (const line of lines) {
          const region = normalize(line.frame, width, height);
          if (region.width > 0 && region.height > 0) regions.push(region);
        }
      }
      return regions;
    },
  };
}

/** MLKit-Pixel-Rechteck (`left/top/right/bottom`) → normalisierte, auf [0,1] geklemmte Region. */
function normalize(frame: Rect, width: number, height: number): DetectedRegion {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const x = clamp01(frame.left / width);
  const y = clamp01(frame.top / height);
  return {
    kind: "licensePlate",
    x,
    y,
    width: clamp01(frame.right / width) - x,
    height: clamp01(frame.bottom / height) - y,
  };
}
