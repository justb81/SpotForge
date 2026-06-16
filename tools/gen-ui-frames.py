#!/usr/bin/env python3
"""Erzeugt die generischen Seltenheits-Kartenrahmen für @spotforge/ui.

Die Rahmen sind kategorie-neutral (rein rarity-gefärbt, kein Logo) und bilden die
verbindliche Baseline für ALLE Apps – eine Variante überschreibt einzelne Stufen
optional über `AppDefinition.assets.cardFrames`. Ausgabe:
`packages/ui/assets/frames/{common,uncommon,rare,epic,legendary}.png` (750×1050,
transparente Mitte; Seltenheitsfarbe + Glow steigen mit der Stufe).

Aufruf:  python3 tools/gen-ui-frames.py
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "packages", "ui", "assets", "frames")


def hx(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def lighten(c, f):
    return tuple(min(255, int(v + (255 - v) * f)) for v in c)


def darken(c, f):
    return tuple(max(0, int(v * (1 - f))) for v in c)


def vgrad(size, top, bottom):
    w, h = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        col = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = col
    return img


def rounded_mask(size, box, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


# Kanonische Rarity-Palette (gespiegelt in packages/ui/src/card/rarity-style.ts).
RARITIES = {
    "common":    hx("#B8BEC9"),
    "uncommon":  hx("#36D399"),
    "rare":      hx("#3B9DFF"),
    "epic":      hx("#B061FF"),
    "legendary": hx("#FFD400"),
}
TIER = {"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "legendary": 4}


def make_frame(name, color):
    W, H = 750, 1050
    tier = TIER[name]
    margin = 16
    border = 22 + tier * 3            # höhere Seltenheit -> kräftigerer Rahmen
    radius = 46
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # 1) Glow (stärker mit Seltenheit)
    glow_strength = 90 + tier * 38
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle(
        [margin, margin, W - margin, H - margin],
        radius=radius, outline=color + (255,), width=border + 10,
    )
    glow = glow.filter(ImageFilter.GaussianBlur(16 + tier * 4))
    glow.putalpha(glow.split()[3].point(lambda p: int(p * glow_strength / 255)))
    out.alpha_composite(glow)

    # 2) Rahmen-Ring (metallischer Vertikalverlauf)
    outer = rounded_mask((W, H), [margin, margin, W - margin, H - margin], radius)
    inner = rounded_mask(
        (W, H),
        [margin + border, margin + border, W - margin - border, H - margin - border],
        max(8, radius - border // 2),
    )
    ring = Image.new("L", (W, H), 0)
    ring.paste(outer, (0, 0))
    ring.paste(Image.new("L", (W, H), 0), (0, 0), inner)
    grad = vgrad((W, H), lighten(color, 0.55), darken(color, 0.35)).convert("RGBA")
    out.paste(grad, (0, 0), ring)

    # 3) Bevel-Linien (heller außen, dunkler innen)
    d = ImageDraw.Draw(out)
    d.rounded_rectangle(
        [margin, margin, W - margin, H - margin], radius=radius,
        outline=lighten(color, 0.7) + (200,), width=2,
    )
    d.rounded_rectangle(
        [margin + border, margin + border, W - margin - border, H - margin - border],
        radius=max(8, radius - border // 2),
        outline=darken(color, 0.55) + (220,), width=2,
    )

    # 4) Eck-/Mittel-Edelsteine (Rauten) als Seltenheits-Akzent
    def gem(cx, cy, r):
        d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)],
                  fill=lighten(color, 0.5) + (255,), outline=darken(color, 0.4) + (255,))
        d.polygon([(cx, cy - r // 2), (cx + r // 2, cy), (cx, cy + r // 2),
                   (cx - r // 2, cy)], fill=(255, 255, 255, 230))

    gr = 16 + tier * 2
    cy_top = margin + border // 2
    cy_bot = H - margin - border // 2
    gem(W // 2, cy_top, gr)
    gem(W // 2, cy_bot, gr)
    # ab Rare zusätzliche Eck-Akzente
    if tier >= 2:
        for cx in (margin + border // 2, W - margin - border // 2):
            gem(cx, cy_top, gr - 4)
            gem(cx, cy_bot, gr - 4)

    out.save(os.path.join(OUT, f"{name}.png"))


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, color in RARITIES.items():
        make_frame(name, color)
    print(f"Generische Kartenrahmen erzeugt: {OUT}")


if __name__ == "__main__":
    main()
