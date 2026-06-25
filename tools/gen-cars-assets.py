#!/usr/bin/env python3
"""Leitet die CarForge-Marken-Grafiken aus der Quelle `carforge.png` ab.

Einzige Quelle ist `variants/cars/assets/carforge.png` (weißes Logo auf
Schwarz). Daraus werden Icon, Splash, In-App-Logo und Hintergrund erzeugt. Die
Seltenheits-Kartenrahmen sind KEINE Assets, sondern werden prozedural gerendert
(ADR 0015, #96 – `CardFrame` in `@spotforge/ui`).

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
    # Rundes, randlos gefülltes Icon: der Kreis nutzt die volle Fläche, die
    # Ecken sind transparent. iOS/Android maskieren das Icon ohnehin – die runde
    # Form ist hier bewusst Teil des Assets (voll ausgefülltes Markenzeichen).
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
    # Kreis-Maske über die gesamte Kantenlänge (kantenglättend via Supersampling)
    scale = 4
    mask = Image.new("L", (S * scale, S * scale), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([0, 0, S * scale - 1, S * scale - 1], fill=255)
    mask = mask.resize((S, S), Image.LANCZOS)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    out.save(os.path.join(ASSETS, "icon.png"))


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


def main():
    logo = load_logo()
    make_icon(logo)
    make_logo(logo)
    make_splash(logo)
    make_background(logo)
    print("CarForge-Marken-Grafiken erzeugt.")


if __name__ == "__main__":
    main()
