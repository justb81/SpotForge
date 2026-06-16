// Themebarer Button. Zieht Farben/Radius/Schrift aus dem ThemeProvider – keine
// fest kodierten Werte.

import { Pressable, StyleSheet, Text } from "react-native";
import { DEFAULT_RADIUS, useTheme } from "../theme/ThemeProvider";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** `primary` nutzt die Primärfarbe, `secondary` die Surface-Farbe. */
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const theme = useTheme();
  const backgroundColor = variant === "primary" ? theme.colors.primary : theme.colors.surface;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderRadius: theme.radius ?? DEFAULT_RADIUS,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: theme.colors.text, fontFamily: theme.typography.fontFamily },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
