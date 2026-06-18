// Ergebnis-Panel eines Treffers: positive Rückmeldung + Draft als Karte (CardView)
// mit der Möglichkeit, ihn zu bestätigen/korrigieren (DraftEditor). Das Forgen ist
// der **Online**-Schritt (ADR 0010) und nicht Teil dieses Panels – ein Hinweis
// macht das sichtbar. Kategorie-neutral: Texte/Theme kommen von außen.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { Button, CardView, useTheme } from "@spotforge/ui";
import { draftPreviewCard } from "./draft-edit";
import { DraftEditor, type DraftEditorLabels } from "./DraftEditor";

export interface DraftPanelLabels {
  /** Positive Rückmeldung über dem Karten-Preview. */
  hit: string;
  /** Hinweis, dass das Forgen online erfolgt. */
  forgePending: string;
  /** Button, der den Editor öffnet. */
  edit: string;
  /** Label vor dem Entdecker-Tag auf der Karte. */
  spottedBy: string;
  /** Rarity-Badge-Text des noch ungeschmiedeten Drafts. */
  draftRarity: string;
  /** Beschriftungen des Editors. */
  editor: DraftEditorLabels;
}

export interface DraftPanelProps {
  /** Der aktuelle Draft. */
  draft: Card;
  /** Attribut-Schema der Kategorie. */
  attributes: AttributeDefinition[];
  /** Lokalisierte Beschriftungen. */
  labels: DraftPanelLabels;
  /** Hebt einen korrigierten Draft nach oben (Quelle der Wahrheit bleibt der Parent). */
  onDraftChange: (draft: Card) => void;
}

export function DraftPanel({ draft, attributes, labels, onDraftChange }: DraftPanelProps) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <View style={styles.root}>
        <DraftEditor
          draft={draft}
          attributes={attributes}
          labels={labels.editor}
          onSave={(next) => {
            onDraftChange(next);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Text style={[styles.hit, { color: theme.colors.accent }]}>{labels.hit}</Text>
      <ScrollView contentContainerStyle={styles.cardWrap} showsVerticalScrollIndicator={false}>
        <CardView
          card={draftPreviewCard(draft)}
          attributes={attributes}
          artSource={draft.photoUri !== undefined ? { uri: draft.photoUri } : undefined}
          spottedByLabel={labels.spottedBy}
          rarityLabel={labels.draftRarity}
        />
      </ScrollView>
      <Text style={[styles.pending, { color: theme.colors.text }]}>{labels.forgePending}</Text>
      <Button label={labels.edit} variant="secondary" onPress={() => setEditing(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  hit: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  cardWrap: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  pending: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
});
