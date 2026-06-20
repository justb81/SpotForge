// Einstellungen (erreichbar über Profil ▸ Einstellungen): nachträgliches Ändern
// der Nutzer-Wahl. Aktuell: ob das Tutorial (FTUE) beim Start gezeigt wird, sowie –
// bei Varianten mit dem Feature – der **Auto-Spot** (#85: Schalter als Fallback zur
// Geste + Intervall-Einstellung). Kategorie-neutral und themebar; alle Texte über
// den TextResolver. Die Tutorial-Wahl wirkt erst beim nächsten Start, der
// Auto-Spot-Schalter sofort.

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";
import {
  AUTO_SPOT_INTERVAL_MAX_MS,
  AUTO_SPOT_INTERVAL_MIN_MS,
  clampAutoSpotInterval,
  resolveFeatures,
} from "@spotforge/app-config";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import type { Preferences } from "../preferences/preferences";
import { TABS, type TabKey } from "../navigation/tabs";
import { resolveAutoSpotInterval } from "../spotting/autoSpot";

/** Schrittweite der Intervall-Einstellung in ms (barrierefreier Fallback zum Slider). */
const INTERVAL_STEP_MS = 500;

export interface SettingsScreenProps {
  t: TextResolver;
  /** Aktive Variante – entscheidet, ob die Auto-Spot-Sektion erscheint (#85). */
  definition: AppDefinition;
  /** Aktuelle Einstellungen (Schalterzustände). */
  preferences: Preferences;
  /** Ändert die Einstellungen (persistiert vom Host). */
  onPreferencesChange: (preferences: Preferences) => void;
  /** Zurück zum Profil. */
  onBack: () => void;
}

export function SettingsScreen({
  t,
  definition,
  preferences,
  onPreferencesChange,
  onBack,
}: SettingsScreenProps) {
  const theme = useTheme();
  const { autoSpot: autoSpotAvailable } = resolveFeatures(definition);
  const intervalMs = resolveAutoSpotInterval(definition, preferences);

  const setIntervalMs = (next: number) => {
    onPreferencesChange({ ...preferences, autoSpotIntervalMs: clampAutoSpotInterval(next) });
  };

  // Auswahl der Start-Ansicht als aufklappbares Drop-down. Die Optionen leiten
  // sich direkt aus der Tab-Definition ab und passen sich automatisch an, wenn
  // sich die Navigation künftig ändert (Tabs hinzukommen/wegfallen).
  const [viewPickerOpen, setViewPickerOpen] = useState(false);
  // Label der aktuell gewählten Start-Ansicht (Fallback „Spot", falls der gespeicherte
  // Tab nach einer Navigations-Änderung nicht mehr existiert).
  const currentViewLabelKey =
    TABS.find((tab) => tab.key === preferences.defaultView)?.labelKey ?? "nav.spot";
  const selectDefaultView = (key: TabKey) => {
    onPreferencesChange({ ...preferences, defaultView: key });
    setViewPickerOpen(false);
  };

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

        {/* Start-Ansicht: Drop-down über alle Tab-Leisten-Ansichten. */}
        <View style={styles.field}>
          <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("settings.defaultView.label")}
              </Text>
              <Text style={[styles.rowHint, { color: theme.colors.text }]}>
                {t("settings.defaultView.hint")}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("settings.defaultView.label")}
              accessibilityState={{ expanded: viewPickerOpen }}
              onPress={() => setViewPickerOpen((open) => !open)}
              style={[styles.select, { borderColor: theme.colors.primary }]}
            >
              <Text style={[styles.selectValue, { color: theme.colors.text }]} numberOfLines={1}>
                {t(currentViewLabelKey)}
              </Text>
              <Text style={[styles.selectChevron, { color: theme.colors.primary }]}>
                {viewPickerOpen ? "▴" : "▾"}
              </Text>
            </Pressable>
          </View>

          {viewPickerOpen ? (
            <View style={[styles.options, { backgroundColor: theme.colors.surface }]}>
              {TABS.map((tab) => {
                const selected = tab.key === preferences.defaultView;
                return (
                  <Pressable
                    key={tab.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectDefaultView(tab.key)}
                    style={styles.option}
                  >
                    <Text style={[styles.optionIcon, { color: theme.colors.accent }]}>
                      {tab.icon}
                    </Text>
                    <Text style={[styles.optionLabel, { color: theme.colors.text }]}>
                      {t(tab.labelKey)}
                    </Text>
                    {selected ? (
                      <Text style={[styles.optionCheck, { color: theme.colors.primary }]}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Auto-Spot (#85): nur bei Varianten mit dem Feature. Schalter = Fallback zur
            versteckten Geste (Barrierefreiheit), darunter die Intervall-Einstellung. */}
        {autoSpotAvailable ? (
          <>
            <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
                  {t("settings.autoSpot.label")}
                </Text>
                <Text style={[styles.rowHint, { color: theme.colors.text }]}>
                  {t("settings.autoSpot.hint")}
                </Text>
              </View>
              <Switch
                accessibilityRole="switch"
                value={preferences.autoSpotEnabled}
                onValueChange={(autoSpotEnabled) =>
                  onPreferencesChange({ ...preferences, autoSpotEnabled })
                }
                trackColor={{ true: theme.colors.primary, false: theme.colors.background }}
              />
            </View>

            <View style={[styles.row, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.colors.text }]}>
                  {t("settings.autoSpot.interval.label")}
                </Text>
                <Text style={[styles.rowHint, { color: theme.colors.text }]}>
                  {t("settings.autoSpot.interval.value", {
                    seconds: (intervalMs / 1000).toFixed(1),
                  })}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Stepper
                  label="−"
                  accessibilityLabel={t("settings.autoSpot.interval.decrease")}
                  disabled={intervalMs <= AUTO_SPOT_INTERVAL_MIN_MS}
                  onPress={() => setIntervalMs(intervalMs - INTERVAL_STEP_MS)}
                  theme={theme}
                />
                <Stepper
                  label="+"
                  accessibilityLabel={t("settings.autoSpot.interval.increase")}
                  disabled={intervalMs >= AUTO_SPOT_INTERVAL_MAX_MS}
                  onPress={() => setIntervalMs(intervalMs + INTERVAL_STEP_MS)}
                  theme={theme}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stepper({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  theme,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.stepperButton,
        { backgroundColor: theme.colors.primary, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Text style={[styles.stepperLabel, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
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
  field: {
    gap: 8,
  },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    maxWidth: 160,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  selectValue: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  selectChevron: {
    fontSize: 14,
    fontWeight: "800",
  },
  options: {
    borderRadius: 12,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
  },
  optionIcon: {
    fontSize: 18,
    width: 24,
    textAlign: "center",
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
  },
  optionCheck: {
    fontSize: 18,
    fontWeight: "800",
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowHint: {
    fontSize: 13,
    opacity: 0.7,
  },
  stepper: {
    flexDirection: "row",
    gap: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperLabel: {
    fontSize: 22,
    fontWeight: "800",
  },
});
