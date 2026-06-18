// Prozedural gerenderter Seltenheits-Kartenrahmen (#96, löst den Frame-Anteil von
// ADR 0011 ab): statt eines gebackenen 750×1050-PNG je Stufe wird der Rahmen mit
// `react-native-svg` aus der Stufen-Farbe (`RARITY_STYLES`) und Theme-Tokens
// gezeichnet – auflösungsunabhängig, randscharf und ohne neue Assets rebrandbar.
//
// Aufbau (von hinten nach vorn): weicher Stufen-Glow → Rahmenring (vertikaler
// Verlauf, hell→dunkel) → heller Karten-Body (zart stufengetönt) → Theme-getönte
// Innenlinie (`theme.colors.primary` → Variante prägt den Rahmen) → Edelstein-
// Ornamente (Mitte oben/unten; Ecken ab Rare). Liegt als Hintergrund hinter dem
// Karteninhalt; den runden Eck-Clip übernimmt der CardView-Container.

import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Polygon, Rect, Stop } from "react-native-svg";
import type { Rarity } from "@spotforge/game-core";
import { DEFAULT_RADIUS, useTheme } from "../theme/ThemeProvider";
import { CARD_FRAME_VIEWBOX, cardFrameSpec } from "./card-frame-style";
import { darken, lighten } from "./color";

export interface CardFrameProps {
  /** Seltenheits-Stufe der Karte – bestimmt Farbe und Geometrie. */
  rarity: Rarity;
  /** Eckenradius in px (aus dem Theme); steuert die Rundung der Rahmen-Geometrie. */
  radius?: number;
}

/** Diamant-Polygon (Edelstein) um (cx, cy) mit Halb-Kantenlänge `g`. */
function diamond(cx: number, cy: number, g: number): string {
  return `${cx},${cy - g} ${cx + g},${cy} ${cx},${cy + g} ${cx - g},${cy}`;
}

export function CardFrame({ rarity, radius = DEFAULT_RADIUS }: CardFrameProps) {
  const theme = useTheme();
  const spec = cardFrameSpec(rarity);
  const { width: W, height: H } = CARD_FRAME_VIEWBOX;

  const bw = spec.borderWidth;
  // Platz zwischen Rahmenring und (geclipptem) Kartenrand für den Glow-Halo.
  const edgeInset = 6 + spec.glowLayers * 4;
  // Mittellinie des Rahmenrings.
  const ringInset = edgeInset + bw / 2;
  const ringRx = Math.max(10, Math.min(60, 28 * (radius / DEFAULT_RADIUS)));

  // Heller Karten-Body innerhalb des Rings (zart in der Stufenfarbe getönt).
  const bodyInset = edgeInset + bw + 4;
  const bodyRx = Math.max(2, ringRx - bw);

  const ringTop = lighten(spec.color, 0.4);
  const ringBottom = darken(spec.color, 0.3);
  const bodyTop = "#FCFDFE";
  const bodyBottom = lighten(spec.color, 0.85);
  const gemFill = lighten(spec.color, 0.3);
  const gemStroke = darken(spec.color, 0.3);

  const cornerGemPoints: [number, number][] = spec.cornerGems
    ? [
        [ringInset + ringRx * 0.5, ringInset + ringRx * 0.5],
        [W - ringInset - ringRx * 0.5, ringInset + ringRx * 0.5],
        [ringInset + ringRx * 0.5, H - ringInset - ringRx * 0.5],
        [W - ringInset - ringRx * 0.5, H - ringInset - ringRx * 0.5],
      ]
    : [];

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="cf-ring" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={ringTop} />
          <Stop offset="1" stopColor={ringBottom} />
        </LinearGradient>
        <LinearGradient id="cf-body" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={bodyTop} />
          <Stop offset="1" stopColor={bodyBottom} />
        </LinearGradient>
      </Defs>

      {/* Stufen-Glow: breite, transparente Ringe unter dem Rahmen → weicher Halo,
          der am geclippten Kartenrand ausläuft. Mehr/kräftiger mit der Stufe. */}
      {Array.from({ length: spec.glowLayers }).map((_, i) => (
        <Rect
          key={i}
          x={ringInset}
          y={ringInset}
          width={W - 2 * ringInset}
          height={H - 2 * ringInset}
          rx={ringRx}
          ry={ringRx}
          fill="none"
          stroke={spec.color}
          strokeWidth={bw + (i + 1) * 9}
          strokeOpacity={(0.18 + spec.tier * 0.04) * (1 - i / (spec.glowLayers + 1))}
        />
      ))}

      {/* Rahmenring (vertikaler Verlauf hell→dunkel). */}
      <Rect
        x={ringInset}
        y={ringInset}
        width={W - 2 * ringInset}
        height={H - 2 * ringInset}
        rx={ringRx}
        ry={ringRx}
        fill="none"
        stroke="url(#cf-ring)"
        strokeWidth={bw}
      />

      {/* Heller Karten-Body. */}
      <Rect
        x={bodyInset}
        y={bodyInset}
        width={W - 2 * bodyInset}
        height={H - 2 * bodyInset}
        rx={bodyRx}
        ry={bodyRx}
        fill="url(#cf-body)"
      />

      {/* Theme-getönte Innenlinie: macht den Rahmen pro Variante rebrandbar, ohne
          die Rarity-Lesbarkeit (Ringfarbe) zu verwässern. */}
      <Rect
        x={bodyInset}
        y={bodyInset}
        width={W - 2 * bodyInset}
        height={H - 2 * bodyInset}
        rx={bodyRx}
        ry={bodyRx}
        fill="none"
        stroke={theme.colors.primary}
        strokeWidth={2.5}
        strokeOpacity={0.55}
      />

      {/* Edelstein-Ornamente: Mitte oben/unten, Ecken ab Rare (spec.cornerGems). */}
      <Polygon
        points={diamond(W / 2, ringInset, spec.gemRadius)}
        fill={gemFill}
        stroke={gemStroke}
        strokeWidth={2}
      />
      <Polygon
        points={diamond(W / 2, H - ringInset, spec.gemRadius)}
        fill={gemFill}
        stroke={gemStroke}
        strokeWidth={2}
      />
      {cornerGemPoints.map(([cx, cy], i) => (
        <Polygon
          key={i}
          points={diamond(cx, cy, spec.gemRadius * 0.8)}
          fill={gemFill}
          stroke={gemStroke}
          strokeWidth={2}
        />
      ))}
    </Svg>
  );
}
