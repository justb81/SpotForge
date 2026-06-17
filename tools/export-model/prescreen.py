#!/usr/bin/env python3
"""Off-Device-Pre-Screen des breiten **Gates** (#83): misst Vehicle-Recall /
False-Negative-Rate auf einem Fahrzeug-/Nicht-Fahrzeug-Bildset und kalibriert die
Annahme-Schwelle.

**Primärziel des Gates ist, False-Negatives zu minimieren** (ein Auto wird nicht
fälschlich als Nicht-Fahrzeug abgelehnt). Dieses Skript bewertet die **gleiche
Entscheidungs-Regel** wie ``packages/ai-engine`` ``evaluateGate`` (``cascade.ts``):
die **summierte** Wahrscheinlichkeitsmasse über die erlaubten Gate-Synsets
(marginale ``P(im Scope)``) gegen eine Schwelle. Es läuft direkt auf dem
**fp32-timm-Modell** – repräsentativ für den fp32-``.pte``-Export (keine
Quantisierung) – und braucht weder das ``.pte`` noch das ExecuTorch-Runtime.

So entscheidet der Pre-Screen B0 vs. Lite0 und die ``minConfidence`` der Variante.

Datensatz-Layout (``--data DIR``)::

    DIR/vehicle/*.{jpg,png,…}      echte Fahrzeug-Fotos  (Soll: akzeptiert)
    DIR/nonvehicle/*.{jpg,png,…}   Nicht-Fahrzeuge       (Soll: abgelehnt)

Die Allowlist (``--allow``) ist ein JSON-Array der erlaubten Gate-Synsets und
**muss die ``gate.allow`` der Variante spiegeln**
(``variants/<app>/app.definition.ts``).

Usage::

    pip install -r tools/export-model/requirements.txt
    python tools/export-model/prescreen.py \\
        --config tools/export-model/models/gate-imagenet-efficientnet-b0.json \\
        --data path/to/eval-set \\
        --allow path/to/cars-allow.json \\
        --topk 20 --target-recall 0.98

Primäre Metrik: **Vehicle-Recall** (= 1 − False-Negative-Rate). Sekundär:
Precision / False-Positive-Rate. Gibt eine Schwellen-Tabelle aus und schlägt die
**kleinste** Schwelle vor, die das Recall-Ziel hält (recall-lastig, #83).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# load_timm_labels/REPO_ROOT aus dem Schwester-Skript wiederverwenden (gleiche
# Label-Quelle wie der Export → identisches Vokabular).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from export import load_timm_labels  # noqa: E402

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def list_images(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)


def vehicle_mass(probs, allow_idx: list[int], topk: int) -> float:
    """Summierte erlaubte Masse über die Top-k-Kandidaten – exakt die Regel von
    ``evaluateGate`` (das Gate-Modell liefert on-device nur Top-k)."""
    top = probs.topk(min(topk, probs.numel()))
    allow = set(allow_idx)
    return float(sum(v.item() for v, i in zip(top.values, top.indices) if int(i) in allow))


def main() -> int:
    parser = argparse.ArgumentParser(description="Off-Device-Pre-Screen des Gates (#83).")
    parser.add_argument("--config", required=True, help="Export-Config (models/<id>.json).")
    parser.add_argument("--data", required=True, help="Eval-Set mit vehicle/ und nonvehicle/.")
    parser.add_argument("--allow", required=True, help="JSON-Array der erlaubten Gate-Synsets.")
    parser.add_argument("--topk", type=int, default=20, help="Gate-topK (Default 20, vgl. GATE_TOP_K).")
    parser.add_argument("--target-recall", type=float, default=0.98, help="Ziel-Vehicle-Recall.")
    parser.add_argument("--out", default="", help="Optional: Report-JSON-Pfad.")
    args = parser.parse_args()

    import torch
    import timm
    from PIL import Image

    cfg = json.loads(Path(args.config).read_text(encoding="utf-8"))
    t = cfg["timm"]
    labels = load_timm_labels(cfg, t)
    label_index = {label: i for i, label in enumerate(labels)}

    allow = json.loads(Path(args.allow).read_text(encoding="utf-8"))
    missing = [a for a in allow if a not in label_index]
    if missing:
        raise SystemExit(f"Allowlist-Einträge fehlen im Label-Vokabular: {missing}")
    allow_idx = [label_index[a] for a in allow]

    model = timm.create_model(t["arch"], pretrained=True, num_classes=t["numClasses"]).eval()
    data_cfg = timm.data.resolve_data_config({}, model=model)
    transform = timm.data.create_transform(**data_cfg)

    data_dir = Path(args.data)
    sets = {"vehicle": list_images(data_dir / "vehicle"), "nonvehicle": list_images(data_dir / "nonvehicle")}
    if not sets["vehicle"] or not sets["nonvehicle"]:
        raise SystemExit(f"Eval-Set unvollständig: {data_dir}/vehicle und /nonvehicle mit Bildern erwartet.")

    masses: dict[str, list[float]] = {"vehicle": [], "nonvehicle": []}
    with torch.no_grad():
        for cls, files in sets.items():
            for f in files:
                img = Image.open(f).convert("RGB")
                logits = model(transform(img).unsqueeze(0))
                probs = torch.softmax(logits, dim=1)[0]
                masses[cls].append(vehicle_mass(probs, allow_idx, args.topk))

    n_veh, n_non = len(masses["vehicle"]), len(masses["nonvehicle"])
    rows = []
    suggestion = None
    for step in range(0, 101, 5):
        thr = step / 100
        tp = sum(1 for m in masses["vehicle"] if m >= thr)
        fp = sum(1 for m in masses["nonvehicle"] if m >= thr)
        recall = tp / n_veh
        fn_rate = 1 - recall
        precision = tp / (tp + fp) if (tp + fp) else 1.0
        fp_rate = fp / n_non
        rows.append({"threshold": thr, "recall": recall, "fnRate": fn_rate, "precision": precision, "fpRate": fp_rate})
        if suggestion is None and recall >= args.target_recall:
            suggestion = thr

    print(f"\nGate-Pre-Screen · {cfg['id']} · arch={t['arch']} · topK={args.topk}")
    print(f"Eval-Set: {n_veh} Fahrzeuge / {n_non} Nicht-Fahrzeuge · {len(allow_idx)} erlaubte Synsets\n")
    print(f"{'thr':>5} {'recall':>8} {'FN-rate':>8} {'precision':>10} {'FP-rate':>8}")
    for r in rows:
        print(f"{r['threshold']:>5.2f} {r['recall']:>8.3f} {r['fnRate']:>8.3f} {r['precision']:>10.3f} {r['fpRate']:>8.3f}")

    print(
        f"\n→ Empfohlene minConfidence (kleinste Schwelle mit Recall ≥ {args.target_recall:.2f}): "
        + (f"{suggestion:.2f}" if suggestion is not None else "keine erreicht das Ziel")
    )

    if args.out:
        report = {
            "model": {"id": cfg["id"], "arch": t["arch"], "quantize": cfg.get("quantize", "none")},
            "topK": args.topk,
            "targetRecall": args.target_recall,
            "counts": {"vehicle": n_veh, "nonvehicle": n_non},
            "allowSynsets": len(allow_idx),
            "thresholds": rows,
            "suggestedMinConfidence": suggestion,
        }
        Path(args.out).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ Report: {args.out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
