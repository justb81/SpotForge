import { ClassificationModule } from "react-native-executorch";
import type { Classifier, ClassifierInput, ClassificationResult } from "../classifier";

/** Modellquelle: gebündeltes Asset (require → number) oder URI/Pfad (string). */
export type ModelSource = number | string;

/**
 * On-Device-Klassifikator auf Basis von **EfficientNet-V2-S** (ImageNet, 1000
 * Klassen, int8-quantisiert) über **react-native-executorch** (PyTorch
 * ExecuTorch). Ersetzt die frühere ONNX-Runtime-Anbindung, die die React-Native-
 * New-Architecture (Bridgeless, Pflicht in Expo SDK 56) nicht unterstützt.
 *
 * ExecuTorch übernimmt Vorverarbeitung (Resize/Normalisierung) und Softmax
 * intern: `forward(imageUri)` liefert eine Label→Wahrscheinlichkeits-Map.
 *
 * Das Modell wird als `.pte` gebündelt ausgeliefert ({@link createClassifier}
 * bekommt die Asset-Quelle vom App-Host) – vollständig offline. Größere bzw.
 * fahrzeug-spezifische Modelle (eigener Export/Fine-Tune) folgen in #9.
 */
export async function createClassifier(
  modelSource: ModelSource,
  onDownloadProgress?: (progress: number) => void,
): Promise<Classifier> {
  const model = await ClassificationModule.fromModelName(
    { modelName: "efficientnet-v2-s-quantized", modelSource },
    onDownloadProgress,
  );

  return {
    async classify({ imageUri }: ClassifierInput): Promise<ClassificationResult> {
      const scores = await model.forward(imageUri);

      let label = "";
      let confidence = -Infinity;
      for (const [name, score] of Object.entries(scores) as [string, number][]) {
        if (score > confidence) {
          confidence = score;
          label = name;
        }
      }
      return { label, confidence: confidence === -Infinity ? 0 : confidence };
    },
  };
}
