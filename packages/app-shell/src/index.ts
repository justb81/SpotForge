// @spotforge/app-shell — öffentliche Einstiegspunkte.
//
// Die generische, kategorie-agnostische App. Siehe README.md.

export { SpotForgeApp } from "./SpotForgeApp";
export type { SpotForgeAppProps } from "./SpotForgeApp";

export { SpotScreen } from "./screens/SpotScreen";
export type { SpotScreenProps } from "./screens/SpotScreen";

export { SpotCamera } from "./camera/SpotCamera";
export type { SpotCameraProps, SpotCameraLabels } from "./camera/SpotCamera";

// Geplant:
//   export const defaultContent: ContentOverrides; // gemeinsame Text-Defaults
