// Reine Hex-Farb-Helfer für das prozedurale Kartenrahmen-Rendering (#96). Bewusst
// dependency- und RN-frei (kein Asset-/Native-Import) → in vitest testbar. Eingaben
// sind die Stufen-Akzentfarben aus `RARITY_STYLES` (#RGB/#RRGGBB) plus Theme-Tokens.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Begrenzt einen Kanal auf ganzzahlige 0..255. */
function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Parst `#RGB` oder `#RRGGBB` zu RGB. Wirft bei ungültiger Eingabe. */
export function hexToRgb(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match || match[1] === undefined) {
    throw new Error(`Ungültige Hex-Farbe: ${hex}`);
  }
  const body =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((c) => c + c)
          .join("")
      : match[1];
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

/** Serialisiert RGB zu `#RRGGBB`. */
export function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (n: number) => clampChannel(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Lineare Mischung zweier Farben: `t=0` → `a`, `t=1` → `b`. */
export function mix(a: string, b: string, t: number): string {
  const ratio = Math.max(0, Math.min(1, t));
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * ratio,
    g: ca.g + (cb.g - ca.g) * ratio,
    b: ca.b + (cb.b - ca.b) * ratio,
  });
}

/** Hellt eine Farbe um `amount` (0..1) Richtung Weiß auf. */
export function lighten(hex: string, amount: number): string {
  return mix(hex, "#FFFFFF", amount);
}

/** Dunkelt eine Farbe um `amount` (0..1) Richtung Schwarz ab. */
export function darken(hex: string, amount: number): string {
  return mix(hex, "#000000", amount);
}
