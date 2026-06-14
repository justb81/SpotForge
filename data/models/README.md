# data/models

ML-Modell-Artefakte für die On-Device-KI (GDD §5.2 / §10.3).

## Modelle

- **Klassifikation:** YOLOv11-nano / MobileNetV4-Small (ONNX, < 50 MB).
- **Card-Art:** LCM oder quantisiertes Stable Diffusion (ONNX, < 200 MB).

## Bezug

Modell-Binärdateien (`*.onnx`, `*.ort`, `*.bin`) werden **nicht** im Git
versioniert (Größe) – siehe `.gitignore`. Sie werden:

1. beim ersten Start bzw. per **OTA/CDN** (Expo OTA) geladen, und
2. im Hintergrund aktualisiert (GDD §10.3 „Model-Updates").

Ein Manifest (`models.manifest.json`, geplant) beschreibt Version, Hash und
Download-URL pro Modell. Lege lokale Modelle zum Testen hier ab.
