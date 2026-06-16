// Bearbeitungs-Formular eines **Drafts** (GDD §5.1, „Draft bestätigen/korrigieren"):
// Korrektur von Marke/Modell und Vorschlagen von Attributwerten vor dem (online,
// #76) Forgen. Alle Farben/Texte kommen von außen (Theme + Labels) – kategorie-neutral.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { Button, useTheme } from "@spotforge/ui";
import {
  applyDraftEdits,
  collectProposedAttributes,
  draftAttributeInputs,
  type AttributeInputs,
} from "./draft-edit";

export interface DraftEditorLabels {
  /** Überschrift des Editors. */
  title: string;
  /** Label des Namensfelds (Marke/Modell). */
  nameLabel: string;
  /** Überschrift des Attribut-Abschnitts. */
  attributesLabel: string;
  /** Bestätigen/Speichern. */
  save: string;
  /** Abbrechen. */
  cancel: string;
}

export interface DraftEditorProps {
  /** Der zu bearbeitende Draft. */
  draft: Card;
  /** Attribut-Schema der Kategorie (Reihenfolge/Label/Einheit). */
  attributes: AttributeDefinition[];
  /** Lokalisierte Beschriftungen. */
  labels: DraftEditorLabels;
  /** Liefert den korrigierten Draft zurück. */
  onSave: (draft: Card) => void;
  /** Bricht ohne Änderung ab. */
  onCancel: () => void;
}

/**
 * Steuert Name + Attribut-Eingaben lokal und reicht beim Speichern den per
 * {@link applyDraftEdits} korrigierten Draft nach oben.
 */
export function DraftEditor({ draft, attributes, labels, onSave, onCancel }: DraftEditorProps) {
  const theme = useTheme();
  const [objectName, setObjectName] = useState(draft.objectName);
  const [inputs, setInputs] = useState<AttributeInputs>(() =>
    draftAttributeInputs(draft, attributes),
  );

  const setAttribute = (key: string, value: string) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const handleSave = () =>
    onSave(
      applyDraftEdits(draft, {
        objectName,
        proposedAttributes: collectProposedAttributes(inputs, attributes),
      }),
    );

  return (
    <View style={styles.root}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{labels.title}</Text>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{labels.nameLabel}</Text>
        <TextInput
          value={objectName}
          onChangeText={setObjectName}
          style={[
            styles.input,
            { color: theme.colors.text, backgroundColor: theme.colors.surface },
          ]}
          placeholderTextColor={theme.colors.text}
        />

        <Text style={[styles.fieldLabel, styles.section, { color: theme.colors.text }]}>
          {labels.attributesLabel}
        </Text>
        {attributes.map((attribute) => (
          <View key={attribute.key} style={styles.attributeRow}>
            <Text style={[styles.attributeLabel, { color: theme.colors.text }]} numberOfLines={1}>
              {attribute.label}
              {attribute.unit ? ` (${attribute.unit})` : ""}
            </Text>
            <TextInput
              value={inputs[attribute.key] ?? ""}
              onChangeText={(value) => setAttribute(attribute.key, value)}
              keyboardType="numeric"
              style={[
                styles.attributeInput,
                { color: theme.colors.text, backgroundColor: theme.colors.surface },
              ]}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button label={labels.cancel} variant="secondary" onPress={onCancel} />
        <Button label={labels.save} onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  form: {
    gap: 8,
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.85,
  },
  section: {
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  attributeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  attributeLabel: {
    flexShrink: 1,
    fontSize: 14,
  },
  attributeInput: {
    width: 120,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
});
