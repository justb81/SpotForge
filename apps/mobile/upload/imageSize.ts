// Liest die Pixel-Maße eines Bildes über Skia – injiziert in die MLKit-Detektoren
// (#89, z.B. `createMlkitFaceDetector`), damit die Detektor-Boxen (in Quellbild-
// Pixeln) auf normalisierte Regionen (0..1) umgerechnet werden können.

import { Skia } from "@shopify/react-native-skia";

export async function skiaImageSize(uri: string): Promise<{ width: number; height: number }> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    data.dispose();
    throw new Error(`Bild konnte nicht dekodiert werden: ${uri}`);
  }
  // Skia-Objekte sind nativer (Off-Heap-)Speicher und werden NICHT vom GC geräumt
  // → nach dem Auslesen der Maße explizit freigeben (sonst Leck je Detektor-Aufruf).
  try {
    return { width: image.width(), height: image.height() };
  } finally {
    image.dispose();
    data.dispose();
  }
}
