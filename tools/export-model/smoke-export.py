#!/usr/bin/env python3
"""Export-Smoke-Test für **Feature-Backbones** (Embedding-Korpus, #88).

Beantwortet eine einzige K.-o.-Frage: **lowert ein timm-Backbone als reiner
Feature-Extraktor** (`num_classes=0` → gepoolter Embedding-Vektor) durch
denselben Pfad wie die Produktions-Pipeline (`export.py`):

    torch.export → to_edge_transform_and_lower(XnnpackPartitioner) → .pte

Hintergrund (#88): Der geplante Erkennungs-Pfad cached on-device das Embedding
(Feature-Vektor *vor* dem Klassifikationskopf) und trainiert den Kopf zentral.
Bevor ein Backbone als Korpus-Basis in Frage kommt, muss es sich überhaupt nach
ExecuTorch lowern lassen — bei ViT-Architekturen (DINOv2 etc.) ist das die
eigentliche Unbekannte, nicht die Feature-Qualität. Dieses Skript klärt **nur**
die Lowering-Machbarkeit + Eckdaten (Embedding-Dim, Input-Size, Params, `.pte`-
Größe). **Nicht** beantwortet: On-Device-Latenz/RAM und Erkennungsqualität — das
ist Geräte-Verifikation (#63) bzw. der Linear-Probe-Bake-off (#88, Stufe 0).

Hinweis: Die Serialisierung braucht das `flatc`-Binary. executorch bringt eins
mit (`executorch/data/bin/flatc`); liegt dessen Verzeichnis nicht auf `$PATH`,
schlägt der letzte Schritt mit `FileNotFoundError: 'flatc'` fehl.

    pip install executorch timm
    python tools/export-model/smoke-export.py \
        --arch vit_small_patch14_dinov2.lvd142m
    # optional: --keep   --out dist/smoke

Der Export ist immer fp32 (ADR 0014 – keine Quantisierung; das Embedding wird auf
dem kanonischen fp32/CPU-Pfad berechnet).
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Export-Smoke-Test für ein timm-Feature-Backbone (#88).")
    parser.add_argument("--arch", default="vit_small_patch14_dinov2.lvd142m",
                        help="timm-arch-Tag (Default: DINOv2 ViT-S/14).")
    parser.add_argument("--out", default="", help="Zielverzeichnis; leer = Temp (mit --keep nach ./smoke-<arch>.pte).")
    parser.add_argument("--keep", action="store_true", help="Das erzeugte .pte behalten statt verwerfen.")
    args = parser.parse_args()

    import torch
    import timm
    from torch.export import export
    from executorch.exir import to_edge_transform_and_lower
    from executorch.backends.xnnpack.partition.xnnpack_partitioner import XnnpackPartitioner

    def stage(name: str) -> None:
        print(f"\n=== {name} ===", flush=True)

    stage(f"create_model({args.arch}, num_classes=0)")
    t0 = time.time()
    model = timm.create_model(args.arch, pretrained=True, num_classes=0).eval()
    input_size = model.pretrained_cfg.get("input_size", (3, 224, 224))
    n_params = sum(p.numel() for p in model.parameters())
    print(f"geladen in {time.time() - t0:.1f}s")

    stage("forward (eager) → Embedding-Dim")
    sample = (torch.randn(1, *input_size),)
    with torch.no_grad():
        emb = model(*sample)
    embed_dim = emb.shape[-1]
    print(f"Embedding-Dim = {embed_dim}")

    stage("torch.export")
    exported = export(model, sample)  # immer fp32 (ADR 0014)
    print("OK")

    stage("to_edge_transform_and_lower(XnnpackPartitioner)")
    program = to_edge_transform_and_lower(exported, partitioner=[XnnpackPartitioner()]).to_executorch()
    print("OK")

    stage("schreibe .pte")
    if args.out:
        out_dir = Path(args.out)
    elif args.keep:
        out_dir = Path.cwd()
    else:
        out_dir = Path("/tmp")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"smoke-{args.arch.replace('/', '_').replace('.', '_')}.pte"
    with open(out_path, "wb") as handle:
        handle.write(program.buffer)
    size_mb = out_path.stat().st_size / (1024 * 1024)

    print("\n" + "─" * 56)
    print(f"  Backbone:      {args.arch}")
    print(f"  Input-Size:    {input_size[1]}x{input_size[2]}")
    print(f"  Embedding-Dim: {embed_dim}")
    print(f"  Params:        {n_params / 1e6:.1f} M")
    print(f"  .pte (fp32):   {size_mb:.1f} MB")
    print("─" * 56)
    print(f"\n✓ {args.arch} lowert nach ExecuTorch (XNNPACK).")

    if not args.keep and not args.out:
        out_path.unlink(missing_ok=True)
    else:
        print(f"  .pte: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
