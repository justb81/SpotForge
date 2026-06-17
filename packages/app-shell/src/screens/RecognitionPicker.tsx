// Auswahl-Dialog nach akzeptiertem Gate (GDD §5.1): Das Feinmodell liefert die
// Top-k-Kandidaten (Marke/Modell) mit Konfidenz – der Spieler wählt den passenden
// oder geht auf manuelle Eingabe. Bei fein-granularer Erkennung ist Top-k die
// bessere UX als ein erzwungener Top-1-Treffer (Modelle sind oft auch bei
// Fehlklassifikation selbstsicher). Kategorie-neutral: Texte/Theme kommen von außen.

import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassificationCandidate } from "@spotforge/ai-engine";
import { useTheme } from "@spotforge/ui";

export interface RecognitionPickerLabels {
  /** Überschrift, z.B. „Erkannt – bitte auswählen". */
  title: string;
  /** Letzter Eintrag: zur manuellen Eingabe wechseln. */
  manual: string;
}

export interface RecognitionPickerProps {
  /** Top-k-Kandidaten des Feinmodells (absteigend nach Konfidenz). */
  candidates: ClassificationCandidate[];
  /** Beschriftungen. */
  labels: RecognitionPickerLabels;
  /** Spieler wählt einen Kandidaten (Index + rohes Label). */
  onSelect: (index: number, label: string) => void;
  /** Spieler wählt „Manuell eingeben". */
  onManual: () => void;
}

/** Bis zu 5 Kandidaten (Label + Konfidenz) plus ein „Manuell eingeben"-Eintrag. */
export function RecognitionPicker({
  candidates,
  labels,
  onSelect,
  onManual,
}: RecognitionPickerProps) {
  const theme = useTheme();
  const top = candidates.slice(0, 5);
  const radius = theme.radius ?? 12;

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{labels.title}</Text>

      {top.map((c, i) => (
        <Pressable
          key={`${i}-${c.label}`}
          accessibilityRole="button"
          onPress={() => onSelect(i, c.label)}
          style={[styles.row, { backgroundColor: theme.colors.surface, borderRadius: radius }]}
        >
          <Text style={[styles.label, { color: theme.colors.text }]} numberOfLines={1}>
            {c.label}
          </Text>
          <Text style={[styles.confidence, { color: theme.colors.accent }]}>
            {Math.round(c.confidence * 100)} %
          </Text>
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={onManual}
        style={[
          styles.row,
          styles.manualRow,
          { borderColor: theme.colors.primary, borderRadius: radius },
        ]}
      >
        <Text style={[styles.label, { color: theme.colors.primary }]}>{labels.manual}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    gap: 8,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  manualRow: {
    backgroundColor: "transparent",
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  confidence: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
