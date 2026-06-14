import { decode as decodeJpeg } from "jpeg-js";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import type { Classifier, ClassifierInput, ClassificationResult } from "../classifier";
import labels from "./imagenet-labels.json";

// Standard-Eingabegröße und ImageNet-Normalisierung (torchvision-Konvention),
// passend zum exportierten MobileNetV2 aus dem ONNX Model Zoo.
const INPUT_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406] as const;
const STD = [0.229, 0.224, 0.225] as const;

/**
 * On-Device-Klassifikator auf Basis von MobileNetV2 (ImageNet, 1000 Klassen)
 * über ONNX Runtime Mobile. Minimaler PoC (#50): Beweis, dass die native
 * Inferenz auf dem Gerät läuft und ein Fahrzeug plausibel erkennt.
 *
 * Das Modell wird **gebündelt** ausgeliefert; die Session wird einmalig aus der
 * lokalen Modell-URI erzeugt (siehe {@link createMobileNetClassifier}).
 */
class MobileNetClassifier implements Classifier {
  constructor(private readonly session: InferenceSession) {}

  async classify({ base64Jpeg }: ClassifierInput): Promise<ClassificationResult> {
    const input = preprocess(base64Jpeg);
    const tensor = new Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]);

    const inputName = this.session.inputNames[0];
    const outputName = this.session.outputNames[0];
    if (!inputName || !outputName) {
      throw new Error("ONNX-Modell ohne Input-/Output-Namen – ungültiges Artefakt.");
    }

    const output = await this.session.run({ [inputName]: tensor });
    const logits = output[outputName]?.data as Float32Array | undefined;
    if (!logits) {
      throw new Error(`ONNX-Ausgabe '${outputName}' fehlt oder ist nicht numerisch.`);
    }

    return topClass(logits);
  }
}

/**
 * Erzeugt einen {@link MobileNetClassifier} aus der lokalen URI des gebündelten
 * Modells. Die URI-Auflösung (z.B. via `expo-asset`) übernimmt der App-Host –
 * so bleibt die ai-engine frei von Expo-/Bundler-Annahmen.
 */
export async function createMobileNetClassifier(modelUri: string): Promise<Classifier> {
  const session = await InferenceSession.create(modelUri);
  return new MobileNetClassifier(session);
}

/** Dekodiert das JPEG und baut den normalisierten NCHW-Float32-Tensor. */
function preprocess(base64Jpeg: string): Float32Array {
  const { data, width, height } = decodeJpeg(base64ToBytes(base64Jpeg), { useTArray: true });
  if (width !== INPUT_SIZE || height !== INPUT_SIZE) {
    throw new Error(
      `Erwartet ${INPUT_SIZE}×${INPUT_SIZE}, erhalten ${width}×${height} – Bild zuerst aufbereiten.`,
    );
  }

  const plane = INPUT_SIZE * INPUT_SIZE;
  const tensor = new Float32Array(3 * plane);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const px = (y * INPUT_SIZE + x) * 4; // RGBA
      const pos = y * INPUT_SIZE + x;
      for (let c = 0; c < 3; c++) {
        const value = (data[px + c] ?? 0) / 255;
        tensor[c * plane + pos] = (value - MEAN[c]!) / STD[c]!;
      }
    }
  }
  return tensor;
}

/** Wählt die Top-Klasse (Argmax) und gibt deren Softmax-Konfidenz zurück. */
function topClass(logits: Float32Array): ClassificationResult {
  let maxIndex = 0;
  let maxLogit = logits[0] ?? -Infinity;
  for (let i = 1; i < logits.length; i++) {
    const v = logits[i]!;
    if (v > maxLogit) {
      maxLogit = v;
      maxIndex = i;
    }
  }

  // Softmax nur für die normalisierte Konfidenz der Top-Klasse.
  let sumExp = 0;
  for (let i = 0; i < logits.length; i++) {
    sumExp += Math.exp(logits[i]! - maxLogit);
  }

  return {
    label: labels[maxIndex] ?? `Klasse ${maxIndex}`,
    confidence: 1 / sumExp,
  };
}

/** Base64 → Bytes, ohne Annahmen über globale `atob`-Verfügbarkeit. */
function base64ToBytes(base64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, "");
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);

  let byte = 0;
  let bits = 0;
  let p = 0;
  for (let i = 0; i < clean.length; i++) {
    byte = (byte << 6) | chars.indexOf(clean[i]!);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[p++] = (byte >> bits) & 0xff;
    }
  }
  return bytes;
}
