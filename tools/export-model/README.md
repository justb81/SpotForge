# tools/export-model

Reproduzierbare **AOT-Export-Pipeline** für On-Device-Klassifikationsmodelle
(#9): aus einem HuggingFace-Modell wird ein ExecuTorch-`.pte`
(`torch.export → XNNPACK`) plus geordneter Label-Satz und Metadaten.

Die Pipeline läuft **außerhalb** des Mobile-Bundles (CI/lokal, Python) – das
fertige `.pte` ist **nicht** im Git, sondern wird als **GitHub-Release-Asset**
gehostet und vom Modell-Manifest (`tools/fetch-models/models.manifest.json`) per
URL + SHA-256 bezogen (gebündelt) bzw. zur Laufzeit per OTA aktualisiert.

## Modell-Kontrakt

`react-native-executorch` (`ClassificationModule.fromCustomModel`) erwartet:

- **Input:** `float32[1,3,H,W]` (RGB), Werte in `[0,1]` nach `(pixel − mean) / std`.
- **Output:** `float32[1,C]` rohe Logits, **gleiche Reihenfolge** wie die Labels;
  Resize/Normalisierung/Softmax übernimmt das native Runtime.

Normalisierung (`normMean`/`normStd`) und Labels reisen **mit dem Modell** (gleiche
Version) – siehe Manifest-Eintrag/`labels.json` –, nicht im App-Code. Das ist
Voraussetzung für saubere OTA-Updates.

## Export-Config

Pro Modell eine Datei unter `models/<id>.json`:

| Feld          | Bedeutung                                                        |
|---------------|------------------------------------------------------------------|
| `id`          | stabile Kennung (= Manifest-`id`, Dateinamenspräfix)             |
| `version`     | semver; bei jedem Re-Export erhöhen                              |
| `category`    | Kategorie-Bezug (`CategoryId`, z.B. `vehicles`)                  |
| `sourceModel` | HF-Repo-ID des Quellmodells                                      |
| `revision`    | HF-Revision/Tag (Reproduzierbarkeit)                            |
| `recipe`      | ExecuTorch-Backend-Recipe (Default `xnnpack`)                    |
| `extraArgs`   | zusätzliche `optimum-cli`-Flags (z.B. Quantisierung)             |
| `output`      | Dateinamen für `model`/`labels`                                  |

Labels und Normalisierung liest das Skript direkt aus den HF-Config-Dateien des
Quellmodells (`config.json` → `id2label`, `preprocessor_config.json` →
`image_mean`/`image_std`); `preprocessor` in der Config kann das überschreiben.

> **Quantisierung (int8):** Die verfügbaren `optimum-cli export executorch`-Flags
> hängen von der `optimum-executorch`-Version ab (`optimum-cli export executorch
> --help`). Trage sie versionsspezifisch unter `extraArgs` ein.

## Verwendung

```bash
pip install -r tools/export-model/requirements.txt
python tools/export-model/export.py \
  --config tools/export-model/models/cars-stanford-vit.json \
  --out dist/models \
  --release-tag model-cars-stanford-vit-v1.0.0
```

Erzeugt in `--out`: `<model>.pte`, `<id>.labels.json`, `<id>.metadata.json`
(inkl. SHA-256) und `<id>.manifest.json` (fertiger `ota`-Eintrag fürs Manifest).
`--skip-export` erzeugt nur Labels/Metadaten (schneller Schema-Check ohne Torch).

## CI / Release

`.github/workflows/model-export.yml` (manuell, `workflow_dispatch`) führt den
Export aus, hängt `.pte` + `labels.json` an ein **GitHub Release** und gibt den
fertigen Manifest-Eintrag in der Job-Summary aus. Ablauf danach:

1. Workflow mit `config` + `release_tag` starten.
2. Aus der Job-Summary den Manifest-Eintrag in
   `tools/fetch-models/models.manifest.json` übernehmen (für `distribution:
   "bundled"` ggf. `distribution` umstellen).
3. Commit/PR; `pnpm fetch-models` zieht gebündelte Artefakte vor dem Build.

## Beispiel: CarForge (Marke + Modell)

`models/cars-stanford-vit.json` exportiert ein auf **Stanford Cars** (196 Klassen
im Format „Make Model Year", z.B. „2012 Tesla Model S") fine-getuntes ViT –
liefert direkt eine modell-genaue Objekt-ID für den Fakten-Lookup (#10).

**Bekannte Grenze:** Der Datensatz endet ~2012; neuere/lokal relevantere Modelle
kommen über einen eigenen Fine-Tune + OTA-Modellupdate dazu (genau dafür der
Lifecycle). Auswahl/Training eines produktionsreifen Fahrzeugmodells und die
Verifikation von Erkennungsqualität/Latenz **auf echtem Gerät** sind bewusst
Mensch-/Geräte-Aufgaben (siehe #9).
