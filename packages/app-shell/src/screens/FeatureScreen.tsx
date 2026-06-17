// Generischer Bereichs-Screen: zentrierter Empty-State mit Glyph, Titel und
// Hinweis. Dient als Gerüst-Platzhalter für Sammlung/Duell/Tausch/Profil, deren
// echte Implementierung in eigenen Issues folgt. Kategorie-neutral und themebar;
// alle Texte kommen über den TextResolver.

import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";

export interface FeatureScreenProps {
  t: TextResolver;
  /** i18n-Schlüssel der Überschrift (z.B. `collection.title`). */
  titleKey: string;
  /** i18n-Schlüssel des erklärenden Empty-State-Textes. */
  bodyKey: string;
  /** Kategorie-neutrales Glyph für den Bereich. */
  icon: string;
}

export function FeatureScreen({ t, titleKey, bodyKey, icon }: FeatureScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        accessibilityRole="header"
        style={[styles.header, { borderBottomColor: theme.colors.surface }]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t(titleKey)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.icon, { color: theme.colors.primary }]}>{icon}</Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>{t(bodyKey)}</Text>
        <Text style={[styles.note, { color: theme.colors.accent }]}>{t("screen.comingSoon")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  icon: {
    fontSize: 56,
    opacity: 0.35,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
  },
  note: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
