// Kompaktes Badge (z.B. Seltenheits-Stufe, Foil-Marker). Farben kommen aus Prop
// oder Theme; nie fest kodiert.

import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export interface BadgeProps {
  label: string;
  /** Hintergrundfarbe; Default: Akzentfarbe des Themes. */
  color?: string;
  /** Textfarbe; Default: Textfarbe des Themes. */
  textColor?: string;
}

export function Badge({ label, color, textColor }: BadgeProps) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? theme.colors.accent }]}>
      <Text style={[styles.label, { color: textColor ?? theme.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
