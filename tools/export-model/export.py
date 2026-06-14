#!/usr/bin/env python3
"""AOT-Export eines HuggingFace-Bildklassifikators nach ExecuTorch `.pte` (#9).

Erzeugt aus einem Export-Config (``models/<id>.json``) reproduzierbar:

* ``<id>.pte``            – das ExecuTorch-Modell (torch.export -> XNNPACK),
* ``<id>.labels.json``    – geordnete Labels (Index = Logit-Position),
* ``<id>.metadata.json``  – Quelle, Revision, Version, SHA-256, Normalisierung,
* ``<id>.manifest.json``  – fertiger ``ota``-Eintrag fürs Modell-Manifest.

Labels und Normalisierung werden direkt aus den HF-Config-Dateien des
Quellmodells gelesen (``config.json`` -> ``id2label``, ``preprocessor_config.json``
-> ``image_mean``/``image_std``) – entkoppelt von der jeweiligen
``transformers``-API.

Modell-Kontrakt (von react-native-executorch gefordert): Input
``float32[1,3,H,W]`` (RGB, nach ``(pixel - mean) / std``), Output ``float32[1,C]``
rohe Logits in Label-Reihenfolge; Softmax übernimmt das native Runtime.

Läuft in CI (``.github/workflows/model-export.yml``) oder lokal:

    pip install -r tools/export-model/requirements.txt
    python tools/export-model/export.py \
        --config tools/export-model/models/cars-stanford-vit.json \
        --out dist/models \
        --release-tag model-cars-stanford-vit-v1.0.0

Das `.pte` selbst gehört **nicht** ins Git; es wird als GitHub-Release-Asset
gehostet und vom Modell-Manifest per URL + SHA-256 bezogen.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path


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


def extract_labels(config: dict) -> list[str]:
    """Geordnete Labels aus ``id2label`` (nach Index sortiert)."""
    id2label = config.get("id2label")
    if not id2label:
        raise SystemExit("Quellmodell-config.json enthält kein id2label.")
    return [id2label[str(i)] for i in range(len(id2label))]


def extract_preprocessor(processor: dict) -> dict | None:
    """Normalisierung (mean/std) aus preprocessor_config.json, falls vorhanden."""
    mean = processor.get("image_mean")
    std = processor.get("image_std")
    if isinstance(mean, list) and isinstance(std, list) and len(mean) == 3 and len(std) == 3:
        return {"normMean": [float(x) for x in mean], "normStd": [float(x) for x in std]}
    return None


def run_export(cfg: dict, work_dir: Path) -> Path:
    """Ruft optimum-cli auf und liefert den Pfad der erzeugten model.pte."""
    out_dir = work_dir / "export"
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
    return produced


def main() -> int:
    parser = argparse.ArgumentParser(description="Exportiert ein HF-Modell nach ExecuTorch .pte (#9).")
    parser.add_argument("--config", required=True, help="Pfad zur Export-Config (models/<id>.json).")
    parser.add_argument("--out", default="dist/models", help="Zielverzeichnis für die Artefakte.")
    parser.add_argument("--release-tag", default="", help="GitHub-Release-Tag für die Asset-URLs im Manifest-Eintrag.")
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "justb81/spotforge"),
                        help="owner/repo für die Release-Asset-URLs.")
    parser.add_argument("--skip-export", action="store_true",
                        help="Nur Labels/Metadaten erzeugen (ohne .pte) – für schnelle Schema-Checks.")
    args = parser.parse_args()

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    model_name = cfg["id"]
    model_out = out_dir / cfg["output"]["model"]
    labels_out = out_dir / cfg["output"]["labels"]
    metadata_out = out_dir / f"{model_name}.metadata.json"
    manifest_out = out_dir / f"{model_name}.manifest.json"

    # Labels + Normalisierung aus den HF-Config-Dateien (kein transformers-API-Aufruf).
    config = load_hf_json(cfg["sourceModel"], cfg["revision"], "config.json")
    labels = extract_labels(config)
    preprocessor = cfg.get("preprocessor")
    if preprocessor is None:
        try:
            processor = load_hf_json(cfg["sourceModel"], cfg["revision"], "preprocessor_config.json")
            preprocessor = extract_preprocessor(processor)
        except Exception as exc:  # noqa: BLE001 – Normalisierung ist optional
            print(f"Hinweis: keine preprocessor_config.json ({exc}); normMean/normStd bleiben offen.")
            preprocessor = None

    labels_out.write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.skip_export:
        print(f"✓ {len(labels)} Labels → {labels_out} (Export übersprungen).")
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        produced = run_export(cfg, Path(tmp))
        shutil.copy2(produced, model_out)

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
        "sourceModel": cfg["sourceModel"],
        "revision": cfg["revision"],
        "task": cfg.get("task", "image-classification"),
        "recipe": cfg.get("recipe", "xnnpack"),
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
        "distribution": "ota",
        "category": cfg["category"],
        "runtime": "react-native-executorch@0.9",
        "compat": {"appMin": "0.1.0"},
        "preprocessor": preprocessor,
        "artifacts": {
            "model": {
                "url": f"{base}/{model_out.name}",
                "dest": f"data/models/{model_out.name}",
                "sha256": model_sha,
                "bytes": model_bytes,
            },
            "labels": {
                "url": f"{base}/{labels_out.name}",
                "dest": f"data/models/{labels_out.name}",
                "sha256": labels_sha,
                "bytes": labels_bytes,
            },
        },
    }
    manifest_out.write_text(json.dumps(manifest_entry, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ Modell:   {model_out} ({model_bytes} Bytes, sha256={model_sha})")
    print(f"✓ Labels:   {labels_out} ({len(labels)} Klassen)")
    print(f"✓ Metadaten:{metadata_out}")
    print(f"✓ Manifest-Eintrag: {manifest_out}")
    print("\nManifest-Eintrag (in tools/fetch-models/models.manifest.json einfügen):\n")
    print(json.dumps(manifest_entry, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
