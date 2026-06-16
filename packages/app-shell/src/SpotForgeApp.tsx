import type { AppDefinition, LocaleCode, ThemeTokens } from "@spotforge/app-config";
import { DEFAULT_LOCALE } from "@spotforge/app-config";
import type { Classifier } from "@spotforge/ai-engine";
import { ThemeProvider } from "@spotforge/ui";
import { SafeAreaView, StyleSheet } from "react-native";
import { SpotScreen } from "./screens/SpotScreen";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende (funktionale) Definition (Identität, Kategorie, Texte …). */
  definition: AppDefinition;
  /**
   * Aufgelöste Theme-Tokens der Variante (Branding, ADR 0011). Der Host löst das
   * Branding (Basis ⊕ Variante) auf und reicht das Theme herein; die generische
   * App stellt es per {@link ThemeProvider} dem @spotforge/ui-Design-System bereit.
   */
  theme: ThemeTokens;
  /** Bevorzugte Anzeige-Sprache; Default: {@link DEFAULT_LOCALE}. */
  locale?: LocaleCode;
  /**
   * On-Device-Klassifikator (#50). Vom App-Host injiziert, sobald das gebündelte
   * Modell geladen ist. Solange `undefined`, zeigt der Spot-Screen einen Lade-/
   * Bereitschaftshinweis statt eines Klassifikationsergebnisses.
   */
  classifier?: Classifier;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte
 * stammen aus der übergebenen {@link AppDefinition} bzw. dem Theme; nichts ist
 * kategorie-spezifisch fest kodiert.
 *
 * Im PoC zeigt die App genau einen Screen – die Spot-Screen-Shell (#48) – und
 * startet direkt dort, ohne Login/Onboarding und vollständig offline.
 * Navigation, FTUE und die übrigen Flows folgen in den MVP-Issues.
 */
export function SpotForgeApp({
  definition,
  theme,
  locale = DEFAULT_LOCALE,
  classifier,
}: SpotForgeAppProps) {
  return (
    <ThemeProvider theme={theme}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SpotScreen definition={definition} locale={locale} classifier={classifier} />
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
