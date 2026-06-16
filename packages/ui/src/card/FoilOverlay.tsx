// Dependency-freier Foil-Effekt (GDD §7.3): mehrere schmale, diagonal gedrehte
// Akzent-Bänder erzeugen einen Schimmer ohne Gradient-Bibliothek. Wird nur über
// Foil-Karten (Level 3) gelegt; die Karte (CardView) clippt den Überstand.

import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function FoilOverlay() {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.band, { backgroundColor: theme.colors.accent, left: `${-15 + i * 30}%` }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    position: "absolute",
    top: "-30%",
    bottom: "-30%",
    width: "12%",
    opacity: 0.1,
    transform: [{ rotate: "18deg" }],
  },
});
