// @spotforge/ui — öffentliche Einstiegspunkte.
//
// Themebares Design-System (ThemeProvider + Basis-Komponenten) und das
// Kartenrendering. Alle Komponenten konsumieren Theme-Tokens aus der aktiven
// AppDefinition; nichts ist kategorie-spezifisch fest kodiert. Siehe README.md.

// Theme
export { ThemeProvider, useTheme, DEFAULT_RADIUS } from "./theme/ThemeProvider";
export type { ThemeProviderProps } from "./theme/ThemeProvider";

// Basis-Komponenten
export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";
export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";
export { StatRow } from "./components/StatRow";
export type { StatRowProps } from "./components/StatRow";

// Kartenrendering
export { CardView } from "./card/CardView";
export type { CardViewProps } from "./card/CardView";
export { FoilOverlay } from "./card/FoilOverlay";
export { rarityStyle, RARITY_STYLES } from "./card/rarity-style";
export type { RarityStyle } from "./card/rarity-style";
export { toStatDisplays, formatStatValue } from "./card/stat";
export type { StatDisplay } from "./card/stat";

// Frame-Auflösung
export { mergeCardFrames } from "./card/frames";
export type { CardFrameSources, ResolvedCardFrames } from "./card/frames";
export { resolveCardFrames, GENERIC_CARD_FRAMES } from "./card/generic-frames";
