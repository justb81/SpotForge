// Die Sammlung: zeigt die lokal gespeicherten Drafts als Karten (CardView). Ersetzt
// den FeatureScreen-Platzhalter des `collection`-Tabs. Bewusst schlank – Filter/
// Sortierung, Deck-Bau und Progression sind ein eigenes Issue (#17); hier geht es
// nur darum, die lokal persistierten Drafts sichtbar zu machen (#102). Kategorie-
// neutral und themebar; alle Texte über den TextResolver.

import { FlatList, StyleSheet, Text, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { CardView, useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import { draftPreviewCard } from "../draft/draft-edit";

export interface CollectionScreenProps {
  t: TextResolver;
  /** Attribut-Schema der Kategorie (Werte-Block der Karten). */
  attributes: AttributeDefinition[];
  /** Die lokal gespeicherten Drafts (neueste zuerst). */
  drafts: Card[];
}

export function CollectionScreen({ t, attributes, drafts }: CollectionScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        accessibilityRole="header"
        style={[styles.header, { borderBottomColor: theme.colors.surface }]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t("collection.title")}</Text>
      </View>

      {drafts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyIcon, { color: theme.colors.primary }]}>▦</Text>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {t("collection.empty")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(card) => card.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <CardView
                card={draftPreviewCard(item)}
                attributes={attributes}
                artSource={item.photoUri !== undefined ? { uri: item.photoUri } : undefined}
                spottedByLabel={t("card.spottedBy")}
                rarityLabel={t("draft.rarity")}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
    opacity: 0.35,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  cardWrap: {
    alignItems: "center",
  },
});
