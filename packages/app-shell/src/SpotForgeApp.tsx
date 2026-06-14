import type { AppDefinition } from "@spotforge/app-config";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende Definition (Identität, Theme, Texte …). */
  definition: AppDefinition;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte
 * stammen aus der übergebenen {@link AppDefinition}.
 *
 * Aktuell ein minimaler Start-Screen (Gerüst) – Spot/Forge/Collect/Battle-Flows
 * folgen in den Feature-Issues. Hier wird bewusst nur Theme/Identität gerendert,
 * um die White-Label-Verkabelung Ende-zu-Ende zu zeigen.
 */
export function SpotForgeApp({ definition }: SpotForgeAppProps) {
  const { theme, identity, content } = definition;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{identity.displayName}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          {content["spot.cta"] ?? "Los geht's"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.85,
  },
});
