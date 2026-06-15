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

**Reproduzierbarer Bezug:** `tools/fetch-models/models.manifest.json` (Schema v3)
beschreibt pro Modell-Artefakt URL, Zielpfad, **SHA-256**, Größe, Version und
Kategorie. `pnpm fetch-models` lädt **alle** Artefakte hierher und verifiziert die
Prüfsumme – in CI **vor dem Bundle** und lokal vor `pnpm dev`. Alle Modelle werden
je Variante **fest ins APK gebündelt**; es gibt **kein Nachladen/OTA** (siehe
[ADR 0008]).

**Generisches Gate-Modell (#50):** `efficientnet_v2_s_int8.pte` (EfficientNet-V2-S,
ImageNet, int8/XNNPACK; ExecuTorch-Export von Software Mansion) wird **gebündelt**
ausgeliefert. Es dient als **breite Gate-Stufe für alle SpotForge-Apps** („gehört
das in den Scope?"); jede App liefert ihre Allowlist über die `AppDefinition`
(siehe `packages/ai-engine/cascade.ts`, [ADR 0008]).

**Fahrzeug-Modelle (#9):** entstehen per eigenem ExecuTorch-Export
(`tools/export-model`: `torch.export → XNNPACK → .pte`, HF via
`optimum-executorch`), werden als **GitHub-Release-Asset** gehostet und vor dem
Build **fest ins CarForge-APK gebündelt** (kein Nachladen zur Laufzeit).

[ADR 0008]: ../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md
