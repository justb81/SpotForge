import type { AppDefinition } from "@spotforge/app-config";
import { SafeAreaView, StyleSheet } from "react-native";
import { SpotScreen } from "./screens/SpotScreen";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende Definition (Identität, Theme, Texte …). */
  definition: AppDefinition;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte
 * stammen aus der übergebenen {@link AppDefinition}.
 *
 * Im PoC zeigt die App genau einen Screen – die Spot-Screen-Shell (#48) – und
 * startet direkt dort, ohne Login/Onboarding und vollständig offline.
 * Navigation, FTUE und die übrigen Flows folgen in den MVP-Issues.
 */
export function SpotForgeApp({ definition }: SpotForgeAppProps) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: definition.theme.colors.background }]}>
      <SpotScreen definition={definition} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
