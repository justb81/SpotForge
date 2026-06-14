# data/models

ML-Modell-Artefakte für die On-Device-KI (GDD §5.2 / §10.3).

## Modelle

- **Klassifikation:** YOLOv11-nano / MobileNetV4-Small (ONNX, < 50 MB).
- **Card-Art:** LCM oder quantisiertes Stable Diffusion (ONNX, < 200 MB).

## Bezug

Modell-Binärdateien (`*.onnx`, `*.ort`, `*.bin`) werden **nicht** im Git
versioniert (Größe) – siehe `.gitignore`.

**Reproduzierbarer Bezug:** `tools/fetch-models/models.manifest.json` beschreibt
pro Modell URL, Zielpfad und **SHA-256**; `pnpm fetch-models` lädt sie hierher und
verifiziert die Prüfsumme. Der Schritt läuft in CI **vor dem Bundle** und lokal
vor `pnpm dev`.

**PoC (#50):** `mobilenetv2-12.onnx` (MobileNetV2, ImageNet, ONNX Model Zoo,
Apache-2.0) wird im nativen Build **gebündelt** (App-Asset, kein CDN). Derselbe
Bündel-Mechanismus trägt bis in die Produktion; der OTA/CDN-Modell-Lifecycle
(GDD §10.3, #9) kommt obendrauf und ersetzt das Bündeln nicht.
