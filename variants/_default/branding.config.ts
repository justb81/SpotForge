import { defineBranding } from "@spotforge/app-config";

/**
 * Generische Branding-Basis für **alle** Apps (ADR 0011): neutrales Theme. Jede
 * Variante (z.B. `cars`) liefert in ihrer eigenen `branding.config.ts` nur
 * Abweichungen; `resolveBranding` legt sie über diese Defaults (Theme tief,
 * Assets pro Feld).
 *
 * Bewusst **ohne** `icon`/`splash`/`logo`: das sind marken-spezifische Assets,
 * die jede Variante selbst beisteuert. `_default` hat daher kein `app.definition.ts`
 * und ist keine eigenständige, baubare App. Die Seltenheits-Kartenrahmen sind
 * **keine** Assets mehr, sondern werden prozedural gerendert (#96, ADR 0015) – ihre
 * Farbe leitet sich app-übergreifend aus `RARITY_STYLES` (@spotforge/ui) ab.
 */
export default defineBranding({
  theme: {
    colors: {
      primary: "#4F46E5",
      secondary: "#1F2937",
      background: "#0B0B0F",
      surface: "#1A1A22",
      text: "#FFFFFF",
      accent: "#FACC15",
    },
    typography: {
      fontFamily: "System",
    },
    radius: 12,
  },
});
