#!/usr/bin/env python3
"""Leitet alle CarForge-Grafiken aus der Marken-Quelle `carforge.png` ab.

Einzige Quelle ist `variants/cars/assets/carforge.png` (weißes Logo auf
Schwarz). Daraus werden Icon, Splash, In-App-Logo, Hintergrund und die fünf
Seltenheits-Kartenrahmen erzeugt – kategorie-spezifisch, daher in der Variante.

Aufruf:  python3 tools/gen-cars-assets.py
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "variants", "cars", "assets")
SRC = os.path.join(ASSETS, "carforge.png")

# Theme-Farben (Spiegel von variants/cars/app.definition.ts)
BG = (14, 14, 14)          # #0E0E0E background
SURFACE = (28, 28, 30)     # #1C1C1E surface
PRIMARY = (225, 6, 0)      # #E10600 Racing-Rot
ACCENT = (255, 212, 0)     # #FFD400 gelb


def hx(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def lighten(c, f):
    return tuple(min(255, int(v + (255 - v) * f)) for v in c)


def darken(c, f):
    return tuple(max(0, int(v * (1 - f))) for v in c)


def load_logo() -> Image.Image:
    """Weißes Logo mit Alpha aus Luminanz – tight zugeschnitten."""
    src = Image.open(SRC).convert("L")
    alpha = src.point(lambda p: 255 if p > 18 else int(p / 18 * 255) if p else 0)
    logo = Image.new("RGBA", src.size, (255, 255, 255, 0))
    logo.putalpha(alpha)
    # auf Weiß setzen, Alpha behalten
    white = Image.new("RGBA", src.size, (255, 255, 255, 255))
    white.putalpha(alpha)
    return white.crop(alpha.getbbox())


def radial_bg(size, inner, outer):
    """Radialer Verlauf inner(Mitte) -> outer(Rand)."""
    w, h = size
    img = Image.new("RGB", size, outer)
    px = img.load()
    cx, cy = w / 2, h / 2
    maxd = (cx**2 + cy**2) ** 0.5
    for y in range(h):
        for x in range(w):
            t = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / maxd
            t = min(1.0, t)
            px[x, y] = tuple(int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3))
    return img


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


def fit(logo, max_w):
    s = max_w / logo.width
    return logo.resize((int(logo.width * s), int(logo.height * s)), Image.LANCZOS)


def tint(logo, color):
    out = Image.new("RGBA", logo.size, color + (0,))
    out.putalpha(logo.split()[3])
    return out


# ---------------------------------------------------------------- icon
def make_icon(logo):
    S = 1024
    bg = radial_bg((S, S), lighten(SURFACE, 0.10), darken(BG, 0.25)).convert("RGBA")
    # warmer Rot-Glow unten
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([S * 0.1, S * 0.62, S * 0.9, S * 1.25], fill=PRIMARY + (120,))
    glow = glow.filter(ImageFilter.GaussianBlur(110))
    bg.alpha_composite(glow)
    lg = fit(logo, int(S * 0.74))
    bg.alpha_composite(lg, ((S - lg.width) // 2, (S - lg.height) // 2))
    bg.convert("RGB").save(os.path.join(ASSETS, "icon.png"))


# ---------------------------------------------------------------- logo (transparent)
def make_logo(logo):
    # großzügiger transparenter Rand, einheitliche Größe
    pad = int(logo.width * 0.06)
    out = Image.new("RGBA", (logo.width + 2 * pad, logo.height + 2 * pad), (0, 0, 0, 0))
    out.alpha_composite(logo, (pad, pad))
    out.save(os.path.join(ASSETS, "logo.png"))


# ---------------------------------------------------------------- splash
def make_splash(logo):
    # transparent -> Expo füllt mit theme.background; weicher Rot-Glow dahinter
    S = 2048
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([S * 0.22, S * 0.22, S * 0.78, S * 0.78], fill=PRIMARY + (70,))
    out.alpha_composite(glow.filter(ImageFilter.GaussianBlur(160)))
    lg = fit(logo, int(S * 0.58))
    out.alpha_composite(lg, ((S - lg.width) // 2, (S - lg.height) // 2))
    out.save(os.path.join(ASSETS, "splash.png"))


# ---------------------------------------------------------------- background
def make_background(logo):
    W, H = 1290, 2796  # Portrait, randlos
    base = vgrad((W, H), lighten(SURFACE, 0.04), darken(BG, 0.35)).convert("RGBA")
    # Rot-Glow oben
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-W * 0.3, -H * 0.12, W * 1.3, H * 0.35], fill=PRIMARY + (60,))
    base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(220)))
    # nur die Auto-Silhouette als zartes Wasserzeichen (Text abschneiden)
    car = logo.crop((0, 0, logo.width, int(logo.height * 0.60)))
    car = fit(car, int(W * 1.15))
    wm = tint(car, (255, 255, 255))
    a = wm.split()[3].point(lambda p: int(p * 0.05))
    wm.putalpha(a)
    base.alpha_composite(wm, ((W - wm.width) // 2, int(H * 0.30)))
    # Vignette
    vig = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.35, -H * 0.18, W * 1.35, H * 1.18], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(260))
    dark = Image.new("RGBA", (W, H), darken(BG, 0.6) + (255,))
    base = Image.composite(base, dark, vig)
    base.convert("RGB").save(os.path.join(ASSETS, "background.png"))


# ---------------------------------------------------------------- card frames
RARITIES = {
    "common":    hx("#B8BEC9"),
    "uncommon":  hx("#36D399"),
    "rare":      hx("#3B9DFF"),
    "epic":      hx("#B061FF"),
    "legendary": ACCENT,
}
TIER = {"common": 0, "uncommon": 1, "rare": 2, "epic": 3, "legendary": 4}


def rounded_mask(size, box, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=radius, fill=255)
    return m


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
        pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
        d.polygon(pts, fill=lighten(color, 0.5) + (255,),
                  outline=darken(color, 0.4) + (255,))
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

    out.save(os.path.join(ASSETS, "frames", f"{name}.png"))


def main():
    os.makedirs(os.path.join(ASSETS, "frames"), exist_ok=True)
    logo = load_logo()
    make_icon(logo)
    make_logo(logo)
    make_splash(logo)
    make_background(logo)
    for name, color in RARITIES.items():
        make_frame(name, color)
    print("CarForge-Grafiken erzeugt.")


if __name__ == "__main__":
    main()
