import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE, resolveText } from "@spotforge/app-config";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende Definition (Identität, Theme, Texte …). */
  definition: AppDefinition;
  /** Bevorzugte Anzeige-Sprache; Default: {@link DEFAULT_LOCALE}. */
  locale?: LocaleCode;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte
 * stammen aus der übergebenen {@link AppDefinition}.
 *
 * Aktuell ein minimaler Start-Screen (Gerüst) – Spot/Forge/Collect/Battle-Flows
 * folgen in den Feature-Issues. Hier wird bewusst nur Theme/Identität gerendert,
 * um die White-Label-Verkabelung Ende-zu-Ende zu zeigen.
 */
export function SpotForgeApp({ definition, locale = DEFAULT_LOCALE }: SpotForgeAppProps) {
  const { theme, identity, content } = definition;
  const cta = content["spot.cta"];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{identity.displayName}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.text }]}>
          {cta ? resolveText(cta, locale) : "Los geht's"}
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
