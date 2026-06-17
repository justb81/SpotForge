// UX für `unrecognized` (GDD §5.1): das Feinmodell liefert nichts Zuordenbares.
// Der Spieler kann das Objekt **manuell kategorisieren** (Name eingeben → Draft);
// die Überprüfung/Freigabe solcher Einträge ist Sache der Kuratierung (#77) und
// der Community (#24). Kategorie-neutral: Texte/Theme kommen von außen.

import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button, useTheme } from "@spotforge/ui";

export interface UnrecognizedPanelLabels {
  /** Überschrift („Nicht erkannt"). */
  title: string;
  /** Erläuternder Hinweis. */
  hint: string;
  /** Label des Namensfelds. */
  nameLabel: string;
  /** Button, der aus der Eingabe einen Draft anlegt. */
  create: string;
}

export interface UnrecognizedPanelProps {
  /** Rohes Top-Label des Feinmodells (kann leer sein). */
  rawLabel: string;
  /** Lokalisierte Beschriftungen. */
  labels: UnrecognizedPanelLabels;
  /** Legt mit dem eingegebenen Namen einen manuellen Draft an. */
  onCreate: (objectName: string) => void;
}

export function UnrecognizedPanel({ rawLabel, labels, onCreate }: UnrecognizedPanelProps) {
  const theme = useTheme();
  const [name, setName] = useState(rawLabel);
  const trimmed = name.trim();

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{labels.title}</Text>
      <Text style={[styles.hint, { color: theme.colors.text }]}>{labels.hint}</Text>

      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{labels.nameLabel}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.surface }]}
        placeholderTextColor={theme.colors.text}
      />

      <Button label={labels.create} onPress={() => onCreate(trimmed)} disabled={trimmed === ""} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    gap: 10,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  hint: {
    fontSize: 14,
    opacity: 0.8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.85,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});
