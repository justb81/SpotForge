import { ImageManipulator, SaveFormat, type ImageResult } from "expo-image-manipulator";
import type { CapturedPhoto } from "./types";

/** Standard-Eingabekantenlänge gängiger Klassifikationsmodelle (z.B. MobileNet). */
export const DEFAULT_MODEL_INPUT_SIZE = 224;

export interface PreprocessOptions {
  /** Ziel-Kantenlänge (quadratisch). Default: {@link DEFAULT_MODEL_INPUT_SIZE}. */
  size?: number;
  /** Base64 mitliefern (für die Pixel-Dekodierung in der Inferenz, #50). */
  includeBase64?: boolean;
}

/**
 * Bereitet ein frisch aufgenommenes Foto für die Klassifikation auf: skaliert
 * es auf eine quadratische Modell-Eingabegröße herunter und gibt ein
 * {@link CapturedPhoto} zurück. Reine On-Device-Bildverarbeitung, kein Upload.
 *
 * Die eigentliche Normalisierung in einen Float-Tensor (Pixel/255, Mean/Std)
 * passiert in der ai-engine (#50) – hier entsteht nur das standardisierte
 * Übergabeformat.
 */
export async function preparePhotoForClassification(
  sourceUri: string,
  options: PreprocessOptions = {},
): Promise<CapturedPhoto> {
  const size = options.size ?? DEFAULT_MODEL_INPUT_SIZE;

  const context = ImageManipulator.manipulate(sourceUri).resize({
    width: size,
    height: size,
  });
  const image = await context.renderAsync();
  const result: ImageResult = await image.saveAsync({
    format: SaveFormat.JPEG,
    base64: options.includeBase64 ?? false,
  });

  return {
    uri: result.uri,
    size,
    base64: result.base64,
  };
}
