import { ClassificationModule } from "react-native-executorch";
import type { Classifier, ClassifierInput, ClassificationResult } from "../classifier";
import { selectTopK } from "../select-top-k";

/** Modellquelle: gebündeltes Asset (`require` → number) oder URI/Pfad (string). */
export type ModelSource = number | string;

/** Per-Kanal-Normalisierung (RGB) für die Vorverarbeitung im nativen Runtime. */
export interface PreprocessorConfig {
  /** Mittelwerte je Kanal, z.B. ImageNet `[0.485, 0.456, 0.406]`. */
  normMean: [number, number, number];
  /** Standardabweichungen je Kanal, z.B. ImageNet `[0.229, 0.224, 0.225]`. */
  normStd: [number, number, number];
}

/**
 * Das eingebaute ImageNet-Basismodell (EfficientNet-V2-S, int8) der PoC-Stufe
 * (#50). Liefert nur grobe 1000-Klassen-Labels; Labels und Normalisierung sind
 * in `react-native-executorch` hinterlegt. Bewusst nur ein Übergangsstand bis
 * zum fahrzeug-spezifischen Modell.
 */
export interface BuiltinImageNetModel {
  kind: "imagenet-efficientnet-v2-s";
  modelSource: ModelSource;
}

/**
 * Ein eigen-exportiertes Modell (#9), z.B. fahrzeug-spezifisch
 * (`tools/export-model`). Labels reisen **mit dem Modell** (gleiche Version),
 * statt im App-Code zu stehen – Voraussetzung für OTA-Updates.
 *
 * Modell-Kontrakt (von `react-native-executorch` gefordert): Input
 * `float32[1,3,H,W]` (RGB, nach `(pixel − mean) / std`), Output `float32[1,C]`
 * mit rohen Logits in der Reihenfolge von {@link labels}; Softmax übernimmt das
 * native Runtime.
 */
export interface CustomClassifierModel {
  kind: "custom";
  modelSource: ModelSource;
  /** Geordnete Labels; Index = Logit-Position. Aus dem Modell-Artefakt geladen. */
  labels: string[];
  /** Normalisierung passend zum Export (Default: keine, Pixel bleiben in [0,1]). */
  preprocessor?: PreprocessorConfig;
}

/** Modell-Deskriptor, den der App-Host an {@link createClassifier} reicht. */
export type ClassifierModel = BuiltinImageNetModel | CustomClassifierModel;

export interface CreateClassifierOptions {
  /** Anzahl zurückgegebener Top-k-Kandidaten (Default 5). */
  topK?: number;
  /** Fortschritt 0..1 beim (Erst-)Laden/Download des Modells. */
  onDownloadProgress?: (progress: number) => void;
}

/**
 * Baut einen On-Device-{@link Classifier} über **react-native-executorch**
 * (PyTorch ExecuTorch) – New-Architecture-/Expo-nativ ([ADR 0007]).
 *
 * Zwei Modellarten:
 * - `imagenet-efficientnet-v2-s`: eingebautes ImageNet-Basismodell (PoC #50).
 * - `custom`: eigen-exportiertes Modell mit mitgeliefertem Label-Satz (#9).
 *
 * ExecuTorch übernimmt Resize/Normalisierung und Softmax intern; `forward`
 * liefert eine Label→Wahrscheinlichkeits-Map, die wir zu Top-k aufbereiten.
 */
export async function createClassifier(
  model: ClassifierModel,
  options: CreateClassifierOptions = {},
): Promise<Classifier> {
  const { topK = 5, onDownloadProgress } = options;

  const module =
    model.kind === "custom"
      ? await ClassificationModule.fromCustomModel(
          model.modelSource,
          {
            labelMap: toLabelMap(model.labels),
            ...(model.preprocessor
              ? {
                  preprocessorConfig: {
                    normMean: model.preprocessor.normMean,
                    normStd: model.preprocessor.normStd,
                  },
                }
              : {}),
          },
          onDownloadProgress,
        )
      : await ClassificationModule.fromModelName(
          { modelName: "efficientnet-v2-s-quantized", modelSource: model.modelSource },
          onDownloadProgress,
        );

  return {
    async classify({ imageUri }: ClassifierInput): Promise<ClassificationResult> {
      const scores = (await module.forward(imageUri)) as Record<string, number>;
      return selectTopK(scores, topK);
    },
  };
}

/** Geordnete Label-Liste → enum-artige `{ [label]: index }`-Map (Library-Format). */
function toLabelMap(labels: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  labels.forEach((label, index) => {
    map[label] = index;
  });
  return map;
}
