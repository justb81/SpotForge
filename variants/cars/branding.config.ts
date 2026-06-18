import { defineBranding } from "@spotforge/app-config";

/**
 * CarForge-Branding: Theme + marken-spezifische Assets. Nur Abweichungen von der
 * Basis `variants/_default` (ADR 0011); `resolveBranding` merged beides. Die
 * Seltenheits-Kartenrahmen sind keine Assets, sondern werden prozedural gerendert
 * (#96, ADR 0015) – ihre Farbe leitet sich aus `RARITY_STYLES` ab; das Theme
 * (z.B. `primary`) tönt den Rahmen pro Variante.
 */
export default defineBranding({
  theme: {
    colors: {
      primary: "#E10600", // Racing-Rot
      secondary: "#1A1A1A",
      background: "#0E0E0E",
      surface: "#1C1C1E",
      text: "#FFFFFF",
      accent: "#FFD400",
    },
    typography: {
      fontFamily: "Inter",
      headingFontFamily: "Inter",
    },
    radius: 16,
  },
  assets: {
    icon: "./assets/icon.png",
    splash: "./assets/splash.png",
    logo: "./assets/logo.png",
    background: "./assets/background.png",
  },
});
