# data/models

ML-Modell-Artefakte für die On-Device-KI (GDD §5.2 / §10.3).

## Modelle

- **Klassifikation:** EfficientNet-V2-S (ImageNet, ExecuTorch `.pte`) als
  PoC-Basismodell; fahrzeug-spezifische Modelle (Marke+Modell) per eigenem
  Export (#9, `tools/export-model`).
- **Card-Art:** On-Device-Generator (#11).

## Bezug

Modell-Binärdateien (`*.pte`, `*.onnx`, `*.ort`, `*.bin`) werden **nicht** im Git
versioniert (Größe) – siehe `.gitignore`.

**Reproduzierbarer Bezug:** `tools/fetch-models/models.manifest.json` (Schema v2)
beschreibt pro Modell-Artefakt URL, Zielpfad und **SHA-256** sowie Version,
`distribution` und Kompatibilität. `pnpm fetch-models` lädt die **gebündelten**
Artefakte hierher und verifiziert die Prüfsumme – in CI **vor dem Bundle** und
lokal vor `pnpm dev`. `ota`-Modelle bezieht der Lifecycle
(`packages/ai-engine/models`) zur Laufzeit (siehe [ADR 0008]).

**Basismodell (#50):** `efficientnet_v2_s_int8.pte` (EfficientNet-V2-S, ImageNet,
int8/XNNPACK; ExecuTorch-Export von Software Mansion) wird **gebündelt**
ausgeliefert und von `react-native-executorch` geladen.

**Fahrzeug-Modelle (#9):** entstehen per eigenem ExecuTorch-Export
(`tools/export-model`: `torch.export → XNNPACK → .pte`, HF via
`optimum-executorch`) und werden als **GitHub-Release-Asset** gehostet. Das
gebündelte Modell bleibt der **Offline-Fallback**; OTA-Updates kommen additiv
obendrauf und ersetzen das Bündeln nicht.

[ADR 0008]: ../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md
