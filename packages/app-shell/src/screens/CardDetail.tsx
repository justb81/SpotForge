// Einzelkarten-Detailansicht der Sammlung: zeigt eine Karte groß (CardView) mit
// Zurück-Aktion und – optional – „Aus Sammlung entfernen" (zweistufige Bestätigung,
// da das Entfernen eines Drafts nicht rückgängig zu machen ist). Kategorie-neutral
// und themebar; alle Texte über die Labels von außen.

import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { Button, CardView, useTheme } from "@spotforge/ui";
import { draftPreviewCard } from "../draft/draft-edit";

export interface CardDetailLabels {
  /** Zurück-Aktion in der Kopfzeile. */
  back: string;
  /** Button, der die Karte aus der Sammlung entfernt (nur bei `onRemove`). */
  remove: string;
  /** Bestätigungs-Label des Entfernens (zweiter Tap). */
  removeConfirm: string;
  /** Label vor dem Entdecker-Tag auf der Karte. */
  spottedBy: string;
  /** Rarity-Badge-Text des noch ungeschmiedeten Drafts. */
  rarity: string;
}

export interface CardDetailProps {
  /** Die anzuzeigende Karte. */
  card: Card;
  /** Attribut-Schema der Kategorie (Werte-Block). */
  attributes: AttributeDefinition[];
  /** Lokalisierte Beschriftungen. */
  labels: CardDetailLabels;
  /** Zurück zur Liste. */
  onBack: () => void;
  /** Entfernt diese Karte aus der Sammlung; ohne Handler erscheint kein Entfernen-Button. */
  onRemove?: () => void;
}

export function CardDetail({ card, attributes, labels, onBack, onRemove }: CardDetailProps) {
  const theme = useTheme();
  // Zweistufige Bestätigung: erster Tap fragt nach, zweiter entfernt – ohne
  // nativen Alert, damit der Flow deterministisch und plattform-neutral bleibt.
  const [confirming, setConfirming] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.surface }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>‹ {labels.back}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <CardView
          card={draftPreviewCard(card)}
          attributes={attributes}
          artSource={card.photoUri !== undefined ? { uri: card.photoUri } : undefined}
          spottedByLabel={labels.spottedBy}
          rarityLabel={labels.rarity}
        />
        {onRemove ? (
          <View style={styles.actions}>
            <Button
              label={confirming ? labels.removeConfirm : labels.remove}
              variant="secondary"
              onPress={() => {
                if (confirming) {
                  onRemove();
                } else {
                  setConfirming(true);
                }
              }}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
  },
  body: {
    padding: 16,
    gap: 16,
    alignItems: "center",
  },
  actions: {
    alignSelf: "stretch",
    paddingHorizontal: 8,
  },
});
