# ADR 0007 – On-Device-Inferenz: ExecuTorch statt ONNX Runtime Mobile

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0001 (React Native/Expo), GDD §5.2/§10.3; Issues #50, #9

## Kontext

Ursprünglich war die On-Device-KI auf **ONNX Runtime Mobile**
(`onnxruntime-react-native`) ausgelegt (Tech-Stack, GDD §10.3). Beim ersten
echten Geräte-Test des Car-Spotting-PoC (#50/#51) zeigte sich ein harter Blocker:

- `onnxruntime-react-native` (bis **1.24.3**, der neuesten auf npm) bindet sein
  JSI-API über das **Legacy-`NativeModules`-Muster** ein
  (`NativeModules.Onnxruntime.install()`).
- Unter der **React-Native New Architecture (Bridgeless)** ist dieses Legacy-
  Modul `null` → `TypeError: Cannot read property 'install' of null` (FATAL beim
  Modul-Import). Bekanntes, offenes Upstream-Problem.
- **Expo SDK 56 / RN 0.85 erzwingt die New Architecture**: `expo prebuild`
  schreibt `newArchEnabled=true` und ignoriert `newArchEnabled: false` in
  `app.config`. Die alte Architektur ist damit kein gangbarer Ausweg.
- Die für die New Architecture korrigierten ONNX-RN-Quellen (1.25/1.26) sind
  **getaggt, aber nicht auf npm veröffentlicht**.

ONNX Runtime Mobile ist auf diesem Stack damit nicht lauffähig.

## Entscheidung

On-Device-Inferenz läuft über **`react-native-executorch`** (PyTorch ExecuTorch,
gepflegt von Software Mansion) – New-Architecture-/Expo-nativ.

- **PoC-Modell (#50):** `EfficientNet-V2-S` (ImageNet, int8/XNNPACK) als
  vorab exportiertes `.pte`, **gebündelt** ausgeliefert (`tools/fetch-models`
  bezieht es per Manifest + SHA-256; Metro-Asset). Vollständig offline.
- ExecuTorch übernimmt Vorverarbeitung (Resize/Normalisierung) und Softmax
  intern; der `Classifier` nimmt eine Bild-URI und liefert Label + Konfidenz.
- **Größere / fahrzeug-spezifische Modelle (#9):** eigener ExecuTorch-Export
  (`torch.export → XNNPACK → .pte`, AOT in CI) bzw. Fine-Tune; HF-Modelle via
  `optimum-executorch`. Generisches ImageNet liefert nur grobe Klassen und ist
  bewusst nur die PoC-Stufe.

## Begründung

- **Einzig tragfähiger Weg auf dem fixierten Stack** (Expo SDK 56 / RN 0.85 New
  Architecture); ONNX-RN ist dort blockiert und ein Downgrade der Architektur
  nicht möglich.
- **Batterien inklusive:** fertige Klassifikations-/Detektions-Modelle inkl.
  Pre/Post-Processing → weniger eigener Tensor-Code (jpeg-js, manuelle
  Normalisierung und ImageNet-Labels entfielen).
- **Allgemeiner Export-Pfad:** jedes PyTorch-Modell lässt sich nach `.pte`
  konvertieren – tragfähig bis zur fahrzeug-spezifischen Erkennung (#9).
- **Backends:** XNNPACK (CPU, portabel), zusätzlich Core ML/MPS (iOS),
  Vulkan/QNN (GPU/NPU) als spätere Optimierung.

## Konsequenzen

- Tech-Stack-Zeile „On-Device-KI" wechselt von ONNX Runtime Mobile auf
  ExecuTorch (CLAUDE.md aktualisiert). GDD-Formulierungen zur Inferenz sind bei
  Gelegenheit nachzuziehen.
- Modellformat ist `.pte` (statt `.onnx`/`.ort`); `tools/fetch-models`,
  `data/models` und Metro-`assetExts` sind entsprechend umgestellt.
- Card-Art-Generierung (#11) und der Modell-Lifecycle/OTA (#9) bauen ebenfalls
  auf ExecuTorch auf.
- Abhängigkeiten: `react-native-executorch`,
  `react-native-executorch-expo-resource-fetcher`, `expo-file-system`,
  `expo-asset`. Der ONNX-spezifische pnpm-Patch entfiel.
- Neubewertung, falls `onnxruntime-react-native` später solide
  Bridgeless-Unterstützung auf npm liefert – derzeit kein Grund für einen
  Rückwechsel.
