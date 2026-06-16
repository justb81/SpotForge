// Theme-Provider: stellt die Theme-Tokens der aktiven Variante per React-Context
// bereit, damit Komponenten ihr Look-&-Feel ziehen, ohne die `AppDefinition`
// durchreichen zu müssen. Quelle der Tokens ist `AppDefinition.theme`
// (@spotforge/app-config) – `ui` kodiert selbst keine Farben/Schriften.

import { createContext, useContext, type ReactNode } from "react";
import type { ThemeTokens } from "@spotforge/app-config";

const ThemeContext = createContext<ThemeTokens | null>(null);

/** Basis-Eckenradius, wenn die Variante kein `theme.radius` setzt. */
export const DEFAULT_RADIUS = 12;

export interface ThemeProviderProps {
  /** Theme-Tokens der aktiven Variante (i.d.R. `AppDefinition.theme`). */
  theme: ThemeTokens;
  children: ReactNode;
}

/** Macht die {@link ThemeTokens} der Variante für alle untergeordneten `ui`-Komponenten verfügbar. */
export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Liefert die aktiven {@link ThemeTokens}. Wirft, wenn außerhalb eines
 * {@link ThemeProvider} verwendet – das deutet auf einen fehlenden Provider am
 * App-/Screen-Root hin.
 */
export function useTheme(): ThemeTokens {
  const theme = useContext(ThemeContext);
  if (theme === null) {
    throw new Error("useTheme: Komponente muss innerhalb eines <ThemeProvider> liegen.");
  }
  return theme;
}
