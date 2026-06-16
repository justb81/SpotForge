// Eine Attribut-Reihe der Karte: Label links, formatierter Wert rechts. Ein
// hervorgehobenes Attribut (z.B. die Trumpf-Auswahl) wird im Akzent gesetzt.

import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import type { StatDisplay } from "../card/stat";

export interface StatRowProps {
  stat: StatDisplay;
  /** Hebt die Reihe hervor (z.B. gewähltes Trumpf-Attribut). */
  highlighted?: boolean;
}

export function StatRow({ stat, highlighted = false }: StatRowProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
        {stat.label}
      </Text>
      <Text
        style={[
          styles.value,
          {
            color: highlighted ? theme.colors.accent : theme.colors.text,
            fontWeight: highlighted ? "800" : "600",
          },
        ]}
      >
        {stat.formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
    opacity: 0.9,
  },
  value: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginLeft: 12,
  },
});
