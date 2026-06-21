// Liest die Pixel-Maße eines Bildes über Skia – injiziert in die MLKit-Detektoren
// (#89, z.B. `createMlkitFaceDetector`), damit die Detektor-Boxen (in Quellbild-
// Pixeln) auf normalisierte Regionen (0..1) umgerechnet werden können.

import { Skia } from "@shopify/react-native-skia";

export async function skiaImageSize(uri: string): Promise<{ width: number; height: number }> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error(`Bild konnte nicht dekodiert werden: ${uri}`);
  return { width: image.width(), height: image.height() };
}
