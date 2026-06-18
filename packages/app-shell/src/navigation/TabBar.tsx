// Untere Tab-Leiste der App. Themebar (Farben aus dem ThemeProvider), barrierearm
// (Rollen/Selektion/Mindest-Touch-Target) und kategorie-neutral – Labels kommen
// über den TextResolver. Reine Präsentation; welche Tabs sichtbar sind, entscheidet
// der AppNavigator über die Progressive-Disclosure-Regeln.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import type { TabDefinition, TabKey } from "./tabs";

export interface TabBarProps {
  tabs: TabDefinition[];
  active: TabKey;
  onSelect: (key: TabKey) => void;
  t: TextResolver;
}

export function TabBar({ tabs, active, onSelect, t }: TabBarProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.background },
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const color = selected ? theme.colors.primary : theme.colors.text;
        const label = t(tab.labelKey);
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            hitSlop={8}
            onPress={() => onSelect(tab.key)}
            style={styles.tab}
          >
            <Text style={[styles.icon, { color, opacity: selected ? 1 : 0.65 }]}>{tab.icon}</Text>
            <Text numberOfLines={1} style={[styles.label, { color, opacity: selected ? 1 : 0.65 }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  icon: {
    fontSize: 20,
    lineHeight: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});
