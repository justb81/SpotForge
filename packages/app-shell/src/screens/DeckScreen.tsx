// Deck-Builder (GDD §7.2): aus der Sammlung ein Deck für Battles zusammenstellen.
// Tippen schaltet eine Karte ins Deck bzw. heraus; die Kopfzeile zeigt die
// Auslastung (X / Kapazität). Karten im Deck sind markiert; ist das Deck voll,
// lassen sich nur noch enthaltene Karten antippen (entfernen). Kategorie-neutral
// und themebar; alle Texte über den TextResolver.

import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { Badge, CardView, useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import { draftPreviewCard } from "../draft/draft-edit";
import { isDeckFull, isInDeck, type Deck } from "../deck/deck";

export interface DeckScreenProps {
  t: TextResolver;
  /** Attribut-Schema der Kategorie (Werte-Block der Karten). */
  attributes: AttributeDefinition[];
  /** Die Sammlung, aus der das Deck gebaut wird (neueste zuerst). */
  cards: Card[];
  /** Aktuelles Deck. */
  deck: Deck;
  /** Deck-Kapazität (Basis 50 + Erweiterungen, GDD §7.2). */
  capacity: number;
  /** Schaltet eine Karte ins Deck bzw. heraus. */
  onToggle: (id: string) => void;
  /** Zurück zur Bibliothek. */
  onBack: () => void;
}

export function DeckScreen({
  t,
  attributes,
  cards,
  deck,
  capacity,
  onToggle,
  onBack,
}: DeckScreenProps) {
  const theme = useTheme();
  const full = isDeckFull(deck, capacity);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.surface }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>‹ {t("deck.back")}</Text>
        </Pressable>
        <Text style={[styles.count, { color: theme.colors.text }]}>
          {t("deck.count", { count: deck.cardIds.length, capacity })}
        </Text>
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyIcon, { color: theme.colors.primary }]}>♦</Text>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>{t("deck.empty")}</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const inDeck = isInDeck(deck, item.id);
            // Volles Deck: nur noch enthaltene Karten antippbar (zum Entfernen).
            const disabled = full && !inDeck;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: inDeck, disabled }}
                disabled={disabled}
                onPress={() => onToggle(item.id)}
                style={[styles.cardWrap, { opacity: disabled ? 0.4 : 1 }]}
              >
                <CardView
                  card={draftPreviewCard(item)}
                  attributes={attributes}
                  artSource={item.photoUri !== undefined ? { uri: item.photoUri } : undefined}
                  spottedByLabel={t("card.spottedBy")}
                  rarityLabel={t("draft.rarity")}
                />
                <View style={styles.badgeRow}>
                  {inDeck ? (
                    <Badge label={t("deck.inDeck")} color={theme.colors.primary} />
                  ) : (
                    <Text style={[styles.addHint, { color: theme.colors.accent }]}>
                      {disabled ? t("deck.full") : t("deck.add")}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: "700",
  },
  count: {
    fontSize: 16,
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
    gap: 8,
  },
  badgeRow: {
    minHeight: 22,
    justifyContent: "center",
  },
  addHint: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
