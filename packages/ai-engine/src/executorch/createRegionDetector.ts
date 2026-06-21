import { ObjectDetectionModule } from "react-native-executorch";
import type { DetectedRegion, RedactionTargetKind, RegionDetector } from "../sanitize";
import type { ModelSource, PreprocessorConfig } from "./createClassifier";

/**
 * Modell-Deskriptor für einen On-Device-**Regionen-Detektor** der Foto-
 * Sanitisierung (#89) – Gesichter bzw. Kfz-Kennzeichen. Wie das Klassifikations-
 * Modell ist es ein eigen-exportiertes, **fest gebündeltes** Artefakt
 * (`tools/export-model` → `tools/fetch-models`, kein Git-Asset; ADR 0008) mit
 * mitgeliefertem (Einzel-)Label.
 *
 * Modell-Kontrakt (von `react-native-executorch` `ObjectDetectionModule`
 * gefordert): Input `float32[1,3,H,W]` (RGB, nach optionaler Normalisierung),
 * Output **drei** `float32`-Tensoren – Boxen `[4·N]` (x1,y1,x2,y2 im Modell-Input-
 * Raum), Scores `[N]`, Klassen-Indizes `[N]`. Resize/Normalisierung,
 * Koordinaten-Rückskalierung, Threshold und NMS macht das native Runtime.
 * Geeignet z.B. für ein einklassiges YOLO-Modell (face / license_plate).
 */
export interface RegionDetectorModel {
  modelSource: ModelSource;
  /** Einzel-Klassen-Label des Detektors (z.B. "face", "license_plate"). */
  label: string;
  /** Auf welches Sanitisierungs-Redaktions-Ziel die Funde abgebildet werden. */
  targetKind: RedactionTargetKind;
  /** Modell-Eingabekantenlänge (YOLO: z.B. 640). */
  inputSize: number;
  /** Normalisierung passend zum Export (Default: keine, Pixel bleiben in [0,1]). */
  preprocessor?: PreprocessorConfig;
  /**
   * Mindest-Konfidenz eines Funds (0..1). Bewusst eher **recall-lastig** wählen –
   * ein verpasstes Gesicht/Kennzeichen ist ein Privacy-Leak, ein Fehlalarm blurrt
   * nur etwas mehr Bild (billig, vgl. die Gate-Asymmetrie #83).
   */
  detectionThreshold?: number;
}

export interface CreateRegionDetectorOptions {
  /**
   * Liefert die Pixel-Maße des Quellbildes (Host-seitig, z.B. via Skia). Die
   * Detektor-Boxen kommen in Quellbild-Pixeln; daraus werden die **normalisierten**
   * {@link DetectedRegion}en (0..1) berechnet, mit denen der {@link ImageProcessor}
   * auflösungsunabhängig redigiert.
   */
  imageSize: (uri: string) => Promise<{ width: number; height: number }>;
  /** Fortschritt 0..1 beim (Erst-)Laden des Modells. */
  onDownloadProgress?: (progress: number) => void;
}

/**
 * Baut einen On-Device-{@link RegionDetector} über **react-native-executorch**
 * (`ObjectDetectionModule.fromCustomModel`) – New-Architecture-/Expo-nativ
 * ([ADR 0007]), Schwester von {@link createClassifier}. Lädt ein eigen-exportiertes
 * Detektions-Modell und bildet die Funde auf normalisierte {@link BlurRegion}en des
 * konfigurierten {@link RegionDetectorModel.targetKind} ab. Eine leere Trefferliste
 * ist kein Fehler (nichts zu blurren).
 */
export async function createRegionDetector(
  model: RegionDetectorModel,
  options: CreateRegionDetectorOptions,
): Promise<RegionDetector> {
  // Diagnose (#89): das Detektions-JSI-Binding muss vom nativen ExecuTorch-Modul
  // installiert sein. Fehlt es, wirft `fromCustomModel` sonst nur ein kryptisches
  // „undefined is not a function" – hier stattdessen eine klare Meldung, die das
  // fehlende Symbol benennt (Klassifikation nutzt `loadClassification`, Detektion
  // `loadObjectDetection`; sind sie nicht installiert, fehlt das OD-Binding im Build).
  const g = globalThis as { loadObjectDetection?: unknown };
  if (typeof g.loadObjectDetection !== "function") {
    throw new Error(
      "react-native-executorch: global.loadObjectDetection ist nicht installiert – " +
        "das Object-Detection-Binding fehlt in diesem nativen Build (Klassifikation läuft, " +
        "Detektion nicht). Ohne dieses Binding kann kein Regionen-Detektor geladen werden.",
    );
  }

  const module = await ObjectDetectionModule.fromCustomModel(
    model.modelSource,
    {
      labelMap: { [model.label]: 0 },
      availableInputSizes: [model.inputSize],
      defaultInputSize: model.inputSize,
      ...(model.preprocessor
        ? {
            preprocessorConfig: {
              normMean: model.preprocessor.normMean,
              normStd: model.preprocessor.normStd,
            },
          }
        : {}),
      ...(model.detectionThreshold !== undefined
        ? { defaultDetectionThreshold: model.detectionThreshold }
        : {}),
    },
    options.onDownloadProgress,
  );

  return {
    async detect({ imageUri }): Promise<DetectedRegion[]> {
      const { width, height } = await options.imageSize(imageUri);
      const detections = await module.forward(imageUri, { inputSize: model.inputSize });
      return detections.map((d) => normalize(d.bbox, model.targetKind, width, height));
    },
  };
}

/** Quellbild-Pixel-Box → normalisierte, auf [0,1] geklemmte {@link DetectedRegion}. */
function normalize(
  bbox: { x1: number; y1: number; x2: number; y2: number },
  kind: RedactionTargetKind,
  width: number,
  height: number,
): DetectedRegion {
  const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
  const x = clamp01(bbox.x1 / width);
  const y = clamp01(bbox.y1 / height);
  return {
    kind,
    x,
    y,
    width: clamp01(bbox.x2 / width) - x,
    height: clamp01(bbox.y2 / height) - y,
  };
}
