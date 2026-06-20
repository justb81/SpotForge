// Einstellungen (erreichbar über Profil ▸ Einstellungen): nachträgliches Ändern
// der Nutzer-Wahl. Aktuell: ob das Tutorial (FTUE) beim Start gezeigt wird.
// Kategorie-neutral und themebar; alle Texte über den TextResolver. Änderungen
// wirken – wie die Auswahl im Überspringen-Dialog – erst beim nächsten Start.

import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import type { Preferences } from "../preferences/preferences";

export interface SettingsScreenProps {
  t: TextResolver;
  /** Aktuelle Einstellungen (Schalterzustände). */
  preferences: Preferences;
  /** Ändert die Einstellungen (persistiert vom Host). */
  onPreferencesChange: (preferences: Preferences) => void;
  /** Zurück zum Profil. */
  onBack: () => void;
}

export function SettingsScreen({
  t,
  preferences,
  onPreferencesChange,
  onBack,
}: SettingsScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.surface }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>
            ‹ {t("settings.back")}
          </Text>
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>
          {t("settings.title")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rowText}>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
              {t("settings.tutorial.label")}
            </Text>
            <Text style={[styles.rowHint, { color: theme.colors.text }]}>
              {t("settings.tutorial.hint")}
            </Text>
          </View>
          {/* Schalter zeigt „Tutorial anzeigen" = Negation von `skipTutorial`. */}
          <Switch
            accessibilityRole="switch"
            value={!preferences.skipTutorial}
            onValueChange={(showTutorial) =>
              onPreferencesChange({ ...preferences, skipTutorial: !showTutorial })
            }
            trackColor={{ true: theme.colors.primary, false: theme.colors.background }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  back: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 8,
  },
  body: {
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 12,
    padding: 16,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowHint: {
    fontSize: 13,
    opacity: 0.7,
  },
});
