# tools/export-model

Reproduzierbare **AOT-Export-Pipeline** für On-Device-Klassifikationsmodelle
(#9): aus einem fertigen Modell wird ein ExecuTorch-`.pte` (`torch.export →
XNNPACK`) plus geordneter Label-Satz und Metadaten. **Kein eigenes Training** –
wir nutzen fertige Modelle von HuggingFace.

Die Pipeline läuft **außerhalb** des Mobile-Bundles (CI/lokal, Python) – das
fertige `.pte` ist **nicht** im Git, sondern wird als **GitHub-Release-Asset**
gehostet und vom Modell-Manifest (`tools/fetch-models/models.manifest.json`) per
URL + SHA-256 bezogen und **fest ins APK gebündelt** (kein Nachladen/OTA).

## Modell-Kontrakt

**Klassifikation** (`ClassificationModule.fromCustomModel`):

- **Input:** `float32[1,3,H,W]` (RGB), Werte in `[0,1]` nach `(pixel − mean) / std`.
- **Output:** `float32[1,C]` rohe Logits, **gleiche Reihenfolge** wie die Labels;
  Resize/Normalisierung/Softmax übernimmt das native Runtime.

**Detektion** (`ObjectDetectionModule.fromCustomModel`, für die Foto-Sanitisierung #89):

- **Input:** `float32[1,3,H,W]` (RGB), Werte in `[0,1]`.
- **Output:** **drei** Tensoren – Boxen `[4·N]` (x1,y1,x2,y2 im Modell-Input-
  Pixelraum), Scores `[N]`, Klassen-Indizes `[N]`; Threshold/NMS/Rückskalierung
  übernimmt das native Runtime.

Normalisierung (`normMean`/`normStd`) und Labels reisen **mit dem Modell** (gleiche
Version) – siehe Manifest-Eintrag/`labels.json` –, nicht im App-Code. So ist das
gebündelte Modell reproduzierbar und in sich konsistent.

## Drei Export-Backends (`format`)

| `format`  | Quelle                                            | Labels / Norm                          |
|-----------|---------------------------------------------------|----------------------------------------|
| `optimum` | HF-*transformers*-Modell                          | `config.json` (`id2label`) / `preprocessor_config.json` |
| `timm`    | timm-Modell: **vortrainiert** (HF-Hub) oder Checkpoint (`.pth`) | JSON-Liste (`labelsJson`) oder CSV (`labelsFile`) / `preprocessor` aus Config |
| `yolo`    | Ultralytics-YOLO-**Detektor** (`.pt` aus HF-Hub)  | `yolo.labels` (Config); keine Norm (`[0,1]`) |

`optimum` nutzt `optimum-cli export executorch`; `timm` lädt das Modell (Gewichte
vortrainiert aus dem HF-Hub via arch-Tag **oder** aus einem Checkpoint) und lowert
es direkt über `torch.export → to_edge_transform_and_lower(XNNPACK)`. `yolo` lädt ein
einklassiges Ultralytics-Detektionsmodell, **wrappt** dessen Ausgabe auf den
3-Tensor-Detektions-Kontrakt (xywh→xyxy, max-Klasse) und lowert ebenso nach XNNPACK.
Der Export ist immer **fp32** ([ADR 0014](../../docs/adr/0014-on-device-inferenz-praezision-fp32.md) –
keine Quantisierung; int8 ist verworfen).

> **`yolo`-Decode auf dem Gerät verifizieren (#63):** der Decode ist auf den
> dokumentierten rne-Kontrakt ausgelegt; die exakte Übereinstimmung mit dem nativen
> Postprocess (NMS/Threshold) sowie Schwellen/Recall werden am echten Gerät geprüft.

## Export-Config

Pro Modell eine Datei unter `models/<id>.json`. Gemeinsame Felder: `id`
(= Manifest-`id`/Dateinamenspräfix), `version` (semver, bei Re-Export erhöhen),
`category` (`CategoryId`), `sourceModel` (HF-Repo), `revision`, `output`
(Dateinamen), `preprocessor` (`normMean`/`normStd`).

`timm`-spezifisch unter `timm`: `arch`, `numClasses`, `inputSize` und je nach
Quelle entweder
- **vortrainiert:** `pretrained: true` (Gewichte aus dem HF-Hub via arch-Tag,
  z.B. `efficientnet_b0.ra_in1k`), oder
- **Checkpoint:** `checkpointFile`, `stateDictKey`;

dazu die Labels entweder als committete JSON-Liste (`labelsJson`, repo-relativer
Pfad – Index = Klasse) oder als CSV (`labelsFile`, `indexColumn`, `labelColumn`).

`yolo`-spezifisch unter `yolo`: `checkpointFile` (`.pt` im HF-Repo `sourceModel`),
`inputSize` (z.B. `[640,640]`) und `labels` (i.d.R. genau eine Klasse, z.B.
`["face"]` / `["license_plate"]`); `preprocessor` bleibt `null` ([0,1] ohne
Norm). Die Detektor-Configs der Sanitisierung (#89) liegen unter
`models/face-yolov8n.json` und `models/license-plate-yolov8n.json` – vor dem
Bündeln `sourceModel`/`checkpointFile` auf das tatsächlich genutzte HF-Repo setzen
und dessen **Lizenz** prüfen.

## Verwendung

```bash
pip install -r tools/export-model/requirements.txt
python tools/export-model/export.py \
  --config tools/export-model/models/cars-jordo23.json \
  --out dist/models \
  --release-tag model-cars-jordo23-v1.0.0
```

Erzeugt in `--out`: `<model>.pte`, `<id>.labels.json`, `<id>.metadata.json`
(inkl. SHA-256) und `<id>.manifest.json` (fertiger Eintrag fürs Manifest).

## CI / Release

`.github/workflows/model-export.yml` (manuell, `workflow_dispatch`) führt den
Export aus, hängt `.pte` + `labels.json` an ein **GitHub Release** und gibt den
fertigen Manifest-Eintrag in der Job-Summary aus. Ablauf danach:

1. Workflow mit `config` + `release_tag` starten.
2. Aus der Job-Summary den Manifest-Eintrag in
   `tools/fetch-models/models.manifest.json` übernehmen.
3. Commit/PR; `pnpm fetch-models` zieht die Artefakte vor dem Build ins Bundle.

## Beispiel: CarForge (Marke + Modell)

`models/cars-jordo23.json` exportiert **Jordo23/vehicle-classifier** –
EfficientNet-B4, **8.949 Klassen „Make Model Year"** (VMMRdb), **MIT-Lizenz**,
fertig fine-getunt. Liefert direkt eine modell-genaue Objekt-ID für den
Fakten-Lookup (#10); Top-5 ist hier praxisrelevanter als Top-1 (→ Top-k-UX).

Dieses Feinmodell ist die zweite Stufe einer **Kaskade** (siehe
`packages/ai-engine/cascade.ts`): zuerst klärt ein breites **Gate**-Modell
„ist das überhaupt ein Fahrzeug?" (und lehnt Nicht-Autos ab – ein schmales
Fahrzeugtyp-Modell könnte das nicht), erst dann wird dieses (ebenfalls gebündelte)
Feinmodell **bei Bedarf** in den Speicher initialisiert.

**Offene Mensch-/Geräte-Aufgaben (#9):** VMMRdb-Provenienz rechtlich gegenchecken,
Verifikation von Erkennungsqualität/Latenz und Größen-/Performance-Budget **auf
echtem Gerät**.

## Beispiel: Gate (ImageNet, fp32)

`models/gate-imagenet-efficientnet-b0.json` exportiert das breite **Gate** der
Kaskade (#83): **EfficientNet-B0**, ImageNet-1k, **vortrainiert** aus dem HF-Hub,
**fp32** (ADR 0014 – kein Quantisierungsverlust). Die Labels sind die **kanonische
ImageNet-1k-Liste**
(`imagenet-1k.labels.json`, erstes Synonym, `_` → Leerzeichen) – committet, damit
sie exakt der `gate.allow`-Allowlist der Varianten entsprechen.

Das Gate klärt „gehört das überhaupt in den Scope?" und ist kategorie-neutral für
**alle** Apps (jede App liefert nur ihre Allowlist). Seine Annahme-Logik schwellt
die **summierte** Fahrzeug-Masse (`packages/ai-engine` `evaluateGate`), nicht den
besten Einzelkandidaten.

## Smoke-Test: Backbone-Lowering prüfen (`smoke-export.py`)

`smoke-export.py` klärt für den Embedding-Korpus-Plan (#88) **eine** Frage: lowert
ein timm-Backbone als reiner **Feature-Extraktor** (`num_classes=0` → gepoolter
Embedding-Vektor) überhaupt durch `torch.export → XNNPACK → .pte`? Bei
ViT-Architekturen (DINOv2 etc.) ist das die eigentliche Unbekannte vor einem
Bake-off. Ausgegeben werden Embedding-Dim, Input-Size, Params und `.pte`-Größe.

```bash
pip install executorch timm
python tools/export-model/smoke-export.py --arch vit_small_patch14_dinov2.lvd142m
# optional: --keep   --out dist/smoke
```

> **Verifiziert (#88):** DINOv2 ViT-S/14 lowert sauber (384-d Embedding, Input
> 518×518, 22,1 M Params, `.pte` fp32 ≈ 84 MB). **Nicht** abgedeckt: On-Device-
> Latenz/RAM (@518² + Attention) und Erkennungsqualität → Geräte-Verifikation
> (#63) bzw. Linear-Probe-Bake-off (#88, Stufe 0). `flatc` muss auf `$PATH` sein
> (executorch bringt eins unter `executorch/data/bin/` mit).

## Pre-Screen: Gate-Recall kalibrieren (`prescreen.py`)

`prescreen.py` misst **off-device** den Vehicle-Recall / False-Negative-Anteil des
Gates und kalibriert die Schwelle (`minConfidence` der Variante). Es bewertet die
**gleiche** Regel wie `evaluateGate` (summierte erlaubte Masse über die Top-k) auf
dem fp32-timm-Modell – kein `.pte`/ExecuTorch-Runtime nötig.

```bash
python tools/export-model/prescreen.py \
  --config tools/export-model/models/gate-imagenet-efficientnet-b0.json \
  --data path/to/eval-set \          # eval-set/vehicle/* und eval-set/nonvehicle/*
  --allow path/to/cars-allow.json \  # JSON-Array = gate.allow der Variante (cars)
  --topk 20 --target-recall 0.98
```

Ausgabe: Schwellen-Tabelle (Recall / FN-Rate / Precision / FP-Rate) und die
**kleinste** Schwelle, die das Recall-Ziel hält. Entscheidet B0 vs. Lite0 und die
`minConfidence`; die finale Geräte-Verifikation (Latenz/Größe/Qualität) ist #63.
