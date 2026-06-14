# data/models

ML-Modell-Artefakte für die On-Device-KI (GDD §5.2 / §10.3).

## Modelle

- **Klassifikation:** EfficientNet-V2-S (ImageNet, ExecuTorch `.pte`).
- **Card-Art:** On-Device-Generator (#11).

## Bezug

Modell-Binärdateien (`*.pte`, `*.onnx`, `*.ort`, `*.bin`) werden **nicht** im Git
versioniert (Größe) – siehe `.gitignore`.

**Reproduzierbarer Bezug:** `tools/fetch-models/models.manifest.json` beschreibt
pro Modell URL, Zielpfad und **SHA-256**; `pnpm fetch-models` lädt sie hierher und
verifiziert die Prüfsumme. Der Schritt läuft in CI **vor dem Bundle** und lokal
vor `pnpm dev`.

**PoC (#50):** `efficientnet_v2_s_int8.pte` (EfficientNet-V2-S, ImageNet,
int8/XNNPACK; ExecuTorch-Export von Software Mansion) wird im nativen Build
**gebündelt** (App-Asset, kein CDN) und von `react-native-executorch` geladen.
Größere bzw. fahrzeug-spezifische Modelle entstehen per eigenem ExecuTorch-Export
(torch.export → `.pte`) bzw. Fine-Tune in **#9**; der OTA/CDN-Lifecycle
(GDD §10.3) kommt obendrauf und ersetzt das Bündeln nicht.
