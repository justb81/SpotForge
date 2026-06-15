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

`react-native-executorch` (`ClassificationModule.fromCustomModel`) erwartet:

- **Input:** `float32[1,3,H,W]` (RGB), Werte in `[0,1]` nach `(pixel − mean) / std`.
- **Output:** `float32[1,C]` rohe Logits, **gleiche Reihenfolge** wie die Labels;
  Resize/Normalisierung/Softmax übernimmt das native Runtime.

Normalisierung (`normMean`/`normStd`) und Labels reisen **mit dem Modell** (gleiche
Version) – siehe Manifest-Eintrag/`labels.json` –, nicht im App-Code. So ist das
gebündelte Modell reproduzierbar und in sich konsistent.

## Zwei Export-Backends (`format`)

| `format`  | Quelle                              | Labels / Norm                          |
|-----------|-------------------------------------|----------------------------------------|
| `optimum` | HF-*transformers*-Modell            | `config.json` (`id2label`) / `preprocessor_config.json` |
| `timm`    | timm-Checkpoint (`.pth`)            | CSV-Spalte / `preprocessor` aus Config |

`optimum` nutzt `optimum-cli export executorch`; `timm` lädt den Checkpoint und
lowert ihn direkt über `torch.export → to_edge_transform_and_lower(XNNPACK)`.

## Export-Config

Pro Modell eine Datei unter `models/<id>.json`. Gemeinsame Felder: `id`
(= Manifest-`id`/Dateinamenspräfix), `version` (semver, bei Re-Export erhöhen),
`category` (`CategoryId`), `sourceModel` (HF-Repo), `revision`, `output`
(Dateinamen), `preprocessor` (`normMean`/`normStd`), `quantize` (`int8`|`none`).

`timm`-spezifisch unter `timm`: `arch`, `numClasses`, `checkpointFile`,
`stateDictKey`, `labelsFile`, `indexColumn`, `labelColumn`, `inputSize`.

> **Quantisierung (int8):** Die XNNPACK-PTQ kalibriert mangels Bilddatensatz mit
> Platzhalter-Tensoren – funktional, aber echte Kalibrierbilder verbessern die
> Genauigkeit (Geräte-/Mensch-Aufgabe).

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
int8-Kalibrierung mit echten Bildern, Verifikation von Erkennungsqualität/Latenz
und Größen-/Performance-Budget **auf echtem Gerät**.
