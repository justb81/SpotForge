import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";

export interface SpotScreenProps {
  /** Aktive Variante – liefert Theme und Texte für die Shell. */
  definition: AppDefinition;
}

/**
 * Die Spot-Screen-Shell des PoC (#48).
 *
 * Bewusst minimal: ein Header, ein Kamera-Auslöser und ein Ergebnisbereich –
 * vorerst reine **Platzhalter**. Der echte Kamera-Capture (#49), die ONNX-
 * Klassifikation (#50) und die Verdrahtung Foto→Inferenz→Anzeige (#51) docken
 * an genau diesen Stellen an. Es gibt kein Login-/Onboarding-Gate: die App
 * startet direkt hier, vollständig offline.
 */
export function SpotScreen({ definition }: SpotScreenProps) {
  const { theme, identity, content } = definition;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.primary }]}>{identity.displayName}</Text>
      </View>

      {/* Ergebnis-Anzeige – Platzhalter bis #50/#51 ein Label + Konfidenz liefern. */}
      <View
        style={[
          styles.resultArea,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius ?? 12 },
        ]}
      >
        <Text style={[styles.resultPlaceholder, { color: theme.colors.text }]}>
          {content["spot.resultPlaceholder"] ?? "Noch kein Spot. Nimm ein Foto auf."}
        </Text>
      </View>

      {/* Kamera-Auslöser – Platzhalter ohne Funktion bis #49 die Kamera anbindet. */}
      <Pressable
        accessibilityRole="button"
        style={[styles.captureButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.captureLabel, { color: theme.colors.text }]}>
          {content["spot.cta"] ?? "Spotten"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  resultArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  resultPlaceholder: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: "center",
  },
  captureButton: {
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  captureLabel: {
    fontSize: 18,
    fontWeight: "700",
  },
});
