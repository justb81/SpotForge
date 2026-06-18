// Foil-Schimmer für Foil-Karten (Level 3, GDD §7.3). Seit #96 Teil des SVG-
// Kartenrenderings (react-native-svg) statt gedrehter View-Bänder: ein diagonaler
// Mehrstufen-Verlauf in der Theme-Akzentfarbe legt mehrere dezente Schimmer-Bänder
// über die Karte. Wird vom CardView als oberste Schicht über den Inhalt gelegt;
// den Überstand clippt der CardView-Container. Eine Animation des Verlaufs ist
// später denkbar (Reanimated/Animated), aktuell bewusst statisch und deterministisch.

import { StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";

/** Diagonale Schimmer-Bänder: schmale Akzent-Spitzen auf transparentem Grund. */
const BANDS = [0.18, 0.5, 0.82];
const PEAK_OPACITY = 0.16;
const BAND_HALF_WIDTH = 0.05;

export function FoilOverlay() {
  const theme = useTheme();
  const stops: { offset: number; opacity: number }[] = [{ offset: 0, opacity: 0 }];
  for (const center of BANDS) {
    stops.push({ offset: center - BAND_HALF_WIDTH, opacity: 0 });
    stops.push({ offset: center, opacity: PEAK_OPACITY });
    stops.push({ offset: center + BAND_HALF_WIDTH, opacity: 0 });
  }
  stops.push({ offset: 1, opacity: 0 });

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="foil-shimmer" x1="0" y1="0" x2="1" y2="1">
          {stops.map((stop, i) => (
            <Stop
              key={i}
              offset={Math.max(0, Math.min(1, stop.offset))}
              stopColor={theme.colors.accent}
              stopOpacity={stop.opacity}
            />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="140" fill="url(#foil-shimmer)" />
    </Svg>
  );
}
