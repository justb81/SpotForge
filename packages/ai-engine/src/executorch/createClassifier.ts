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
 * Modell-Deskriptor, den der App-Host an {@link createClassifier} reicht. **Jedes**
 * On-Device-Modell ist ein eigen-exportiertes Artefakt (`tools/export-model`, #9)
 * mit **mitgeliefertem Label-Satz** – sowohl das breite Gate (fp32-ImageNet, #83)
 * als auch das fahrzeug-spezifische Feinmodell. Labels reisen **mit dem Modell**
 * (gleiche Version), statt im App-Code zu stehen – so ist das gebündelte Modell
 * reproduzierbar und in sich konsistent.
 *
 * Modell-Kontrakt (von `react-native-executorch` gefordert): Input
 * `float32[1,3,H,W]` (RGB, nach `(pixel − mean) / std`), Output `float32[1,C]`
 * mit rohen Logits in der Reihenfolge von {@link labels}; Softmax übernimmt das
 * native Runtime.
 */
export interface ClassifierModel {
  modelSource: ModelSource;
  /** Geordnete Labels; Index = Logit-Position. Aus dem Modell-Artefakt geladen. */
  labels: string[];
  /** Normalisierung passend zum Export (Default: keine, Pixel bleiben in [0,1]). */
  preprocessor?: PreprocessorConfig;
}

export interface CreateClassifierOptions {
  /** Anzahl zurückgegebener Top-k-Kandidaten (Default 5; Gate: {@link GATE_TOP_K}). */
  topK?: number;
  /** Fortschritt 0..1 beim (Erst-)Laden des Modells. */
  onDownloadProgress?: (progress: number) => void;
}

/**
 * Baut einen On-Device-{@link Classifier} über **react-native-executorch**
 * (PyTorch ExecuTorch) – New-Architecture-/Expo-nativ ([ADR 0007]).
 *
 * Lädt ein eigen-exportiertes Modell (`fromCustomModel`) mit mitgeliefertem
 * Label-Satz + Normalisierung. ExecuTorch übernimmt Resize/Normalisierung und
 * Softmax intern; `forward` liefert eine Label→Wahrscheinlichkeits-Map, die wir
 * zu Top-k aufbereiten.
 */
export async function createClassifier(
  model: ClassifierModel,
  options: CreateClassifierOptions = {},
): Promise<Classifier> {
  const { topK = 5, onDownloadProgress } = options;

  const module = await ClassificationModule.fromCustomModel(
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
