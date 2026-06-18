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
export { CardFrame } from "./card/CardFrame";
export type { CardFrameProps } from "./card/CardFrame";
export { FoilOverlay } from "./card/FoilOverlay";
export { rarityStyle, RARITY_STYLES } from "./card/rarity-style";
export type { RarityStyle } from "./card/rarity-style";
export { cardFrameSpec, CARD_FRAME_VIEWBOX } from "./card/card-frame-style";
export type { CardFrameSpec } from "./card/card-frame-style";
export { toStatDisplays, formatStatValue } from "./card/stat";
export type { StatDisplay, ToStatDisplaysOptions } from "./card/stat";
