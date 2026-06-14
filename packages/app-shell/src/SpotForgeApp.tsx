import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE } from "@spotforge/app-config";
import type { Classifier } from "@spotforge/ai-engine";
import { SafeAreaView, StyleSheet } from "react-native";
import { SpotScreen } from "./screens/SpotScreen";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende Definition (Identität, Theme, Texte …). */
  definition: AppDefinition;
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
 * stammen aus der übergebenen {@link AppDefinition}.
 *
 * Im PoC zeigt die App genau einen Screen – die Spot-Screen-Shell (#48) – und
 * startet direkt dort, ohne Login/Onboarding und vollständig offline.
 * Navigation, FTUE und die übrigen Flows folgen in den MVP-Issues.
 */
export function SpotForgeApp({
  definition,
  locale = DEFAULT_LOCALE,
  classifier,
}: SpotForgeAppProps) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: definition.theme.colors.background }]}>
      <SpotScreen definition={definition} locale={locale} classifier={classifier} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
