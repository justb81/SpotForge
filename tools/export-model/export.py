#!/usr/bin/env python3
"""AOT-Export eines Bildklassifikators nach ExecuTorch `.pte` (#9).

Erzeugt aus einem Export-Config (``models/<id>.json``) reproduzierbar:

* ``<id>.pte``            – das ExecuTorch-Modell (XNNPACK, fp32),
* ``<id>.labels.json``    – geordnete Labels (Index = Logit-Position),
* ``<id>.metadata.json``  – Quelle, Revision, Version, SHA-256, Normalisierung,
* ``<id>.manifest.json``  – fertiger Eintrag fürs Modell-Manifest (gebündelt).

Drei Export-Backends (Config-Feld ``format``):

* ``optimum`` – HuggingFace-*transformers*-Modelle via ``optimum-executorch``
  (``optimum-cli export executorch``). Labels/Normalisierung aus ``config.json``
  bzw. ``preprocessor_config.json``.
* ``timm``    – ein timm-Modell wird direkt über ``torch.export → XNNPACK``
  gelowert; entweder **vortrainiert** (``timm.pretrained: true`` – Gewichte aus
  dem HF-Hub via arch-Tag, z.B. das breite ImageNet-Gate EfficientNet-B0, #83)
  oder aus einem **Checkpoint** (``.pth``, z.B. Jordo23/vehicle-classifier,
  EfficientNet-B4, 8.949 Klassen). Labels aus einer committeten JSON-Liste
  (``timm.labelsJson``, repo-relativ) oder einer CSV (``timm.labelsFile``),
  Normalisierung aus der Config.
* ``yolo``    – ein (einklassiges) Ultralytics-YOLO-**Detektionsmodell** (`.pt`
  aus dem HF-Hub) für die Foto-Sanitisierung (#89, Gesicht/Kennzeichen). Wird auf
  den rne-Detektions-Kontrakt gewrappt (3 Output-Tensoren, s.u.) und nach
  ExecuTorch gelowert. Labels aus der Config (``yolo.labels``).

Der Export ist immer **fp32** (ADR 0014 – keine Quantisierung; int8 ist verworfen).

Modell-Kontrakt (von react-native-executorch gefordert):
* Klassifikation (``optimum``/``timm``): Input ``float32[1,3,H,W]`` (RGB, nach
  ``(pixel - mean) / std``), Output ``float32[1,C]`` rohe Logits in Label-
  Reihenfolge; Softmax übernimmt das native Runtime.
* Detektion (``yolo``): Input ``float32[1,3,H,W]`` (RGB, [0,1]), Output **drei**
  Tensoren – Boxen ``[4·N]`` (x1,y1,x2,y2), Scores ``[N]``, Klassen ``[N]``;
  Threshold/NMS/Rückskalierung macht das native Runtime.

Läuft in CI (``.github/workflows/model-export.yml``) oder lokal:

    pip install -r tools/export-model/requirements.txt
    python tools/export-model/export.py \
        --config tools/export-model/models/cars-jordo23.json \
        --out dist/models \
        --release-tag model-cars-jordo23-v1.0.0

Das `.pte` selbst gehört **nicht** ins Git; es wird als GitHub-Release-Asset
gehostet und vom Modell-Manifest per URL + SHA-256 bezogen.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# Repo-Wurzel (tools/export-model/export.py → ../../). Für repo-relative Pfade
# (z.B. timm.labelsJson), unabhängig vom aktuellen Arbeitsverzeichnis.
REPO_ROOT = Path(__file__).resolve().parents[2]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_hf_json(repo_id: str, revision: str, filename: str) -> dict:
    """Lädt eine JSON-Config-Datei aus einem HF-Repo (ohne transformers-API)."""
    from huggingface_hub import hf_hub_download

    path = hf_hub_download(repo_id=repo_id, filename=filename, revision=revision)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


# --- Backend: optimum (HF transformers) -------------------------------------


def export_optimum(cfg: dict, model_out: Path) -> tuple[list[str], dict | None]:
    """Exportiert ein transformers-Modell via optimum-cli und liefert (labels, preprocessor)."""
    config = load_hf_json(cfg["sourceModel"], cfg["revision"], "config.json")
    id2label = config.get("id2label")
    if not id2label:
        raise SystemExit("Quellmodell-config.json enthält kein id2label.")
    labels = [id2label[str(i)] for i in range(len(id2label))]

    preprocessor = cfg.get("preprocessor")
    if preprocessor is None:
        try:
            proc = load_hf_json(cfg["sourceModel"], cfg["revision"], "preprocessor_config.json")
            mean, std = proc.get("image_mean"), proc.get("image_std")
            if isinstance(mean, list) and isinstance(std, list) and len(mean) == 3 == len(std):
                preprocessor = {"normMean": [float(x) for x in mean], "normStd": [float(x) for x in std]}
        except Exception as exc:  # noqa: BLE001
            print(f"Hinweis: keine preprocessor_config.json ({exc}).")

    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp) / "export"
        cmd = [
            "optimum-cli", "export", "executorch",
            "--model", cfg["sourceModel"],
            "--task", cfg.get("task", "image-classification"),
            "--recipe", cfg.get("recipe", "xnnpack"),
            "--output_dir", str(out_dir),
            *cfg.get("extraArgs", []),
        ]
        print("→", " ".join(cmd), flush=True)
        subprocess.run(cmd, check=True)
        produced = out_dir / "model.pte"
        if not produced.exists():
            raise SystemExit(f"Export lieferte kein model.pte unter {out_dir}.")
        shutil.copy2(produced, model_out)

    return labels, preprocessor


# --- Backend: timm (.pth checkpoint) ----------------------------------------


def labels_from_csv(path: str, index_col: str, label_col: str) -> list[str]:
    with open(path, newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    # Index → Label. Die Quell-CSV kann mehrere Zeilen pro Klassen-ID enthalten
    # (Datenfehler, z.B. Jordo23 global_class_id 106 doppelt) – nach Index
    # zusammenführen, sonst überstiege die Label-Anzahl die Klassen des Modell-Kopfs.
    # Bei WIDERSPRÜCHLICHEM Label hart abbrechen (dann ist die am Modell-Output
    # ausgerichtete Reihenfolge nicht mehr eindeutig).
    by_index: dict[int, str] = {}
    for r in rows:
        idx = int(r[index_col])
        label = r[label_col]
        if idx in by_index and by_index[idx] != label:
            raise SystemExit(
                f"Widersprüchliche Labels für {index_col}={idx}: {by_index[idx]!r} != {label!r}."
            )
        by_index[idx] = label
    # Lückenlos 0..N-1 erwartet (Index = Modell-Output-Position).
    if sorted(by_index) != list(range(len(by_index))):
        raise SystemExit(
            f"{index_col} ist nicht lückenlos 0..{len(by_index) - 1} "
            f"(min={min(by_index)}, max={max(by_index)})."
        )
    return [by_index[i] for i in range(len(by_index))]


def load_timm_labels(cfg: dict, t: dict) -> list[str]:
    """Geordnete Labels: entweder eine committete JSON-Liste (``labelsJson``,
    repo-relativ – z.B. die kanonische ImageNet-1k-Liste fürs Gate, #83) oder
    eine CSV aus dem Quell-Repo (``labelsFile``)."""
    if t.get("labelsJson"):
        path = Path(t["labelsJson"])
        if not path.is_absolute():
            path = REPO_ROOT / path
        labels = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(labels, list) or not all(isinstance(x, str) for x in labels):
            raise SystemExit(f"labelsJson {path} ist keine JSON-Liste von Strings.")
        return labels

    from huggingface_hub import hf_hub_download

    labels_path = hf_hub_download(repo_id=cfg["sourceModel"], filename=t["labelsFile"], revision=cfg["revision"])
    return labels_from_csv(labels_path, t["indexColumn"], t["labelColumn"])


def export_timm(cfg: dict, model_out: Path) -> tuple[list[str], dict | None]:
    """Lädt ein timm-Modell (vortrainiert ODER aus Checkpoint) und lowert es
    direkt nach ExecuTorch .pte."""
    import torch
    import timm
    from torch.export import export
    from executorch.exir import to_edge_transform_and_lower
    from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

    t = cfg["timm"]
    if t.get("pretrained"):
        # Vortrainiertes timm-Modell (z.B. das breite ImageNet-Gate, #83); die
        # Gewichte zieht timm reproduzierbar aus dem HF-Hub anhand des arch-Tags.
        model = timm.create_model(t["arch"], pretrained=True, num_classes=t["numClasses"])
    else:
        from huggingface_hub import hf_hub_download

        ckpt_path = hf_hub_download(repo_id=cfg["sourceModel"], filename=t["checkpointFile"], revision=cfg["revision"])
        checkpoint = torch.load(ckpt_path, map_location="cpu", weights_only=False)
        state = checkpoint[t["stateDictKey"]] if t.get("stateDictKey") else checkpoint
        model = timm.create_model(t["arch"], pretrained=False, num_classes=t["numClasses"])
        model.load_state_dict(state)
    model.eval()

    labels = load_timm_labels(cfg, t)
    if len(labels) != t["numClasses"]:
        raise SystemExit(f"Label-Anzahl {len(labels)} != numClasses {t['numClasses']}.")

    h, w = t["inputSize"]
    sample = (torch.randn(1, 3, h, w),)
    exported = export(model, sample)  # immer fp32 (ADR 0014)
    edge = to_edge_transform_and_lower(exported, partitioner=[XnnpackPartitioner()])
    program = edge.to_executorch()
    with open(model_out, "wb") as handle:
        handle.write(program.buffer)

    return labels, cfg.get("preprocessor")


# --- Backend: yolo (Ultralytics Detektion → ExecuTorch) ---------------------


class _YoloDetectWrapper:
    """Wrappt das rohe Ultralytics-Detect-Modell auf den **react-native-executorch**-
    ``ObjectDetectionModule.fromCustomModel``-Kontrakt: Input ``float32[1,3,H,W]``
    (RGB, [0,1]), Output **drei** Tensoren – Boxen ``[4·N]`` (x1,y1,x2,y2 im
    Modell-Input-Pixelraum), Scores ``[N]``, Klassen-Indizes ``[N]`` (float32).
    Threshold + NMS + Rückskalierung macht das native Runtime; das Modell liefert
    nur die rohen Kandidaten.

    Ultralytics liefert im Eval-Modus ``[1, 4+nc, A]`` mit bereits dekodierten
    xywh-Boxen (Pixel) und (sigmoid) Klassen-Scores. Wir transponieren, splitten
    in Box/Score, nehmen das Maximum über die Klassen und wandeln xywh → xyxy.
    Als ``torch.nn.Module`` gebaut, damit ``torch.export`` den Decode mit in den
    Graphen zieht (kein Python-Postprocess zur Laufzeit)."""

    def build(self, raw_model, num_classes: int):  # pragma: no cover - benötigt torch
        import torch

        nc = num_classes

        class Wrapper(torch.nn.Module):
            def __init__(self, model):
                super().__init__()
                self.model = model

            def forward(self, x):
                out = self.model(x)
                preds = out[0] if isinstance(out, (tuple, list)) else out
                preds = preds[0].transpose(0, 1)  # [A, 4+nc]
                xywh = preds[:, :4]
                scores, classes = preds[:, 4 : 4 + nc].max(dim=1)
                cx, cy, w, h = xywh[:, 0], xywh[:, 1], xywh[:, 2], xywh[:, 3]
                boxes = torch.stack(
                    [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], dim=1
                ).reshape(-1)
                return boxes, scores, classes.to(torch.float32)

        return Wrapper(raw_model).eval()


def export_yolo(cfg: dict, model_out: Path) -> tuple[list[str], dict | None]:
    """Lädt ein (einklassiges) Ultralytics-YOLO-Detektionsmodell und lowert es –
    auf den rne-Detektions-Kontrakt gewrappt – nach ExecuTorch ``.pte`` (#89).

    Für die Foto-Sanitisierung: Gesichts-/Kennzeichen-Detektor. Quelle ist ein
    ``.pt``-Checkpoint aus dem HF-Hub (``yolo.checkpointFile``); die Labels kommen
    aus der Config (``yolo.labels``, i.d.R. genau eine Klasse). YOLO erwartet
    Pixel in ``[0,1]`` ohne Mittelwert-/Std-Normalisierung → ``preprocessor`` bleibt
    leer.

    Hinweis: Der Decode (xywh→xyxy, max-Klasse) ist auf den dokumentierten
    rne-Kontrakt ausgelegt; die exakte Übereinstimmung mit dem nativen
    Postprocess (NMS/Threshold) ist **auf dem Gerät zu verifizieren** (#63)."""
    import torch
    from torch.export import export
    from executorch.exir import to_edge_transform_and_lower
    from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner
    from huggingface_hub import hf_hub_download
    from ultralytics import YOLO

    y = cfg["yolo"]
    labels = y["labels"]
    if not isinstance(labels, list) or not all(isinstance(s, str) for s in labels) or not labels:
        raise SystemExit("yolo.labels muss eine nicht-leere Liste von Strings sein.")

    ckpt_path = hf_hub_download(
        repo_id=cfg["sourceModel"], filename=y["checkpointFile"], revision=cfg["revision"]
    )
    raw_model = YOLO(ckpt_path).model.eval()
    wrapped = _YoloDetectWrapper().build(raw_model, len(labels))

    h, w = y["inputSize"]
    sample = (torch.randn(1, 3, h, w),)
    exported = export(wrapped, sample)  # immer fp32 (ADR 0014)
    edge = to_edge_transform_and_lower(exported, partitioner=[XnnpackPartitioner()])
    program = edge.to_executorch()
    with open(model_out, "wb") as handle:
        handle.write(program.buffer)

    return labels, cfg.get("preprocessor")


# --- Gemeinsam: Metadaten + Manifest-Eintrag --------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Exportiert ein Modell nach ExecuTorch .pte (#9).")
    parser.add_argument("--config", required=True, help="Pfad zur Export-Config (models/<id>.json).")
    parser.add_argument("--out", default="dist/models", help="Zielverzeichnis für die Artefakte.")
    parser.add_argument("--release-tag", default="", help="GitHub-Release-Tag für die Asset-URLs im Manifest-Eintrag.")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "justb81/spotforge"),
                        help="owner/repo für die Release-Asset-URLs.")
    args = parser.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    model_name = cfg["id"]
    model_out = out_dir / cfg["output"]["model"]
    labels_out = out_dir / cfg["output"]["labels"]
    metadata_out = out_dir / f"{model_name}.metadata.json"
    manifest_out = out_dir / f"{model_name}.manifest.json"

    fmt = cfg.get("format", "optimum")
    if fmt == "timm":
        labels, preprocessor = export_timm(cfg, model_out)
    elif fmt == "optimum":
        labels, preprocessor = export_optimum(cfg, model_out)
    elif fmt == "yolo":
        labels, preprocessor = export_yolo(cfg, model_out)
    else:
        raise SystemExit(f"Unbekanntes format '{fmt}' (erwartet 'optimum', 'timm' oder 'yolo').")

    labels_out.write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")

    model_sha = sha256_file(model_out)
    labels_sha = sha256_file(labels_out)
    model_bytes = model_out.stat().st_size
    labels_bytes = labels_out.stat().st_size
    base = f"https://github.com/{args.repo}/releases/download/{args.release_tag}" if args.release_tag else "TODO-set-release-tag"

    metadata = {
        "id": model_name,
        "name": cfg["name"],
        "version": cfg["version"],
        "category": cfg["category"],
        "format": fmt,
        "sourceModel": cfg["sourceModel"],
        "revision": cfg["revision"],
        "precision": "fp32",
        "numClasses": len(labels),
        "preprocessor": preprocessor,
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "gitCommit": os.environ.get("GITHUB_SHA", ""),
        "model": {"file": model_out.name, "sha256": model_sha, "bytes": model_bytes},
        "labels": {"file": labels_out.name, "sha256": labels_sha, "bytes": labels_bytes},
    }
    metadata_out.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    manifest_entry = {
        "id": model_name,
        "name": cfg["name"],
        "version": cfg["version"],
        "category": cfg["category"],
        "preprocessor": preprocessor,
        "artifacts": {
            "model": {"url": f"{base}/{model_out.name}", "dest": f"data/models/{model_out.name}", "sha256": model_sha, "bytes": model_bytes},
            "labels": {"url": f"{base}/{labels_out.name}", "dest": f"data/models/{labels_out.name}", "sha256": labels_sha, "bytes": labels_bytes},
        },
    }
    manifest_out.write_text(json.dumps(manifest_entry, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ Modell:   {model_out} ({model_bytes} Bytes, sha256={model_sha})")
    print(f"✓ Labels:   {labels_out} ({len(labels)} Klassen)")
    print(f"✓ Metadaten:{metadata_out}")
    print(f"✓ Manifest: {manifest_out}")
    print("\nManifest-Eintrag (in tools/fetch-models/models.manifest.json einfügen):\n")
    print(json.dumps(manifest_entry, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
