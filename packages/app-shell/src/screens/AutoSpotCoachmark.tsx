// Einmaliger Onboarding-Coachmark für die Auto-Spot-Geste (#85). Ohne Hinweis ist
// der hinter dem Auslöser versteckte Toggle praktisch unauffindbar; zugleich trägt
// der Coachmark den Akku-/Privacy-Hinweis (on-device, kein Upload). Kategorie-
// neutral und themebar – alle Texte kommen als Labels herein.

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@spotforge/ui";

export interface AutoSpotCoachmarkLabels {
  /** Überschrift: erklärt die Geste in einem Satz. */
  title: string;
  /** Fließtext: Geste + Akku-/Privacy-Hinweis. */
  body: string;
  /** Button, der den Coachmark schließt (und ihn als gesehen markiert). */
  dismiss: string;
}

export interface AutoSpotCoachmarkProps {
  labels: AutoSpotCoachmarkLabels;
  /** Schließt den Coachmark; der Aufrufer persistiert „gesehen". */
  onDismiss: () => void;
}

/** Leichtgewichtiges Overlay über der Kamera-Stage; tippt sich mit einem CTA weg. */
export function AutoSpotCoachmark({ labels, onDismiss }: AutoSpotCoachmarkProps) {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]} accessibilityViewIsModal>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius ?? 12 },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>{labels.title}</Text>
        <Text style={[styles.body, { color: theme.colors.text }]}>{labels.body}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={[styles.cta, { backgroundColor: theme.colors.primary }]}
        >
          <Text style={[styles.ctaLabel, { color: theme.colors.text }]}>{labels.dismiss}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 24,
    paddingBottom: 96,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  card: {
    width: "100%",
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  cta: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});
