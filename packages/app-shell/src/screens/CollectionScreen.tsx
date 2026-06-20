// Die Sammlung / Kartenbibliothek (GDD §7.2): zeigt die lokal gespeicherten Karten
// als CardView – mit **Freitextsuche** und **Sortierung** (neueste/älteste/Name/
// Seltenheit). Tippen auf eine Karte öffnet die Einzelkarten-Detailansicht
// (CardDetail). Von hier aus erreichbar: der **Deck-Builder** (DeckScreen), sofern
// der Host Deck-Status reicht. Kategorie-neutral und themebar; alle Texte über den
// TextResolver.

import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { CardView, useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import { draftPreviewCard } from "../draft/draft-edit";
import { LIBRARY_SORTS, queryLibrary, type LibrarySort } from "../collection/library";
import type { Deck } from "../deck/deck";
import { CardDetail } from "./CardDetail";
import { DeckScreen } from "./DeckScreen";

export interface CollectionScreenProps {
  t: TextResolver;
  /** Attribut-Schema der Kategorie (Werte-Block der Karten). */
  attributes: AttributeDefinition[];
  /** Die lokal gespeicherten Karten (neueste zuerst). */
  drafts: Card[];
  /** Entfernt einen Draft aus der Sammlung; ohne Handler gibt es kein Entfernen in der Detailansicht. */
  onRemoveDraft?: (id: string) => void;
  /** Aktuelles Deck; nur mit den Deck-Props erscheint der Deck-Builder. */
  deck?: Deck;
  /** Deck-Kapazität (Basis 50 + Erweiterungen, GDD §7.2). */
  deckCapacity?: number;
  /** Schaltet eine Karte ins Deck bzw. heraus. */
  onToggleDeck?: (id: string) => void;
}

export function CollectionScreen({
  t,
  attributes,
  drafts,
  onRemoveDraft,
  deck,
  deckCapacity,
  onToggleDeck,
}: CollectionScreenProps) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deckMode, setDeckMode] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");

  const deckEnabled =
    deck !== undefined && deckCapacity !== undefined && onToggleDeck !== undefined;

  // Gefilterte + sortierte Bibliothek; memoisiert, da Sortierung über die Liste läuft.
  const shown = useMemo(
    () => queryLibrary(drafts, { sort, filter: { search } }),
    [drafts, sort, search],
  );

  // Deck-Builder als Unteransicht (nur wenn der Host Deck-Status reicht).
  if (deckMode && deckEnabled) {
    return (
      <DeckScreen
        t={t}
        attributes={attributes}
        cards={drafts}
        deck={deck}
        capacity={deckCapacity}
        onToggle={onToggleDeck}
        onBack={() => setDeckMode(false)}
      />
    );
  }

  // Detailansicht, solange eine noch vorhandene Karte ausgewählt ist; wurde sie
  // entfernt (oder verschwand anderweitig), fällt die Anzeige auf die Liste zurück.
  const selected = selectedId !== null ? drafts.find((d) => d.id === selectedId) : undefined;
  if (selected) {
    return (
      <CardDetail
        card={selected}
        attributes={attributes}
        labels={{
          back: t("collection.back"),
          remove: t("collection.remove"),
          removeConfirm: t("collection.removeConfirm"),
          spottedBy: t("card.spottedBy"),
          rarity: t("draft.rarity"),
        }}
        onBack={() => setSelectedId(null)}
        onRemove={
          onRemoveDraft
            ? () => {
                onRemoveDraft(selected.id);
                setSelectedId(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        accessibilityRole="header"
        style={[styles.header, { borderBottomColor: theme.colors.surface }]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t("collection.title")}</Text>
        {deckEnabled ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDeckMode(true)}
            style={styles.deckButton}
          >
            <Text style={[styles.deckButtonText, { color: theme.colors.accent }]}>
              {t("deck.manage")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {drafts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyIcon, { color: theme.colors.primary }]}>▦</Text>
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>
            {t("collection.empty")}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.controls}>
            <TextInput
              accessibilityLabel={t("collection.search")}
              placeholder={t("collection.search")}
              placeholderTextColor={theme.colors.text + "80"}
              value={search}
              onChangeText={setSearch}
              style={[
                styles.search,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.surface,
                },
              ]}
            />
            <View style={styles.sortRow}>
              {LIBRARY_SORTS.map((option) => {
                const active = option === sort;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setSort(option)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.text, opacity: active ? 1 : 0.7 },
                      ]}
                    >
                      {t(`collection.sort.${option}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {shown.length === 0 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                {t("collection.noMatches")}
              </Text>
            </View>
          ) : (
            <FlatList
              data={shown}
              keyExtractor={(card) => card.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedId(item.id)}
                  style={styles.cardWrap}
                >
                  <CardView
                    card={draftPreviewCard(item)}
                    attributes={attributes}
                    artSource={item.photoUri !== undefined ? { uri: item.photoUri } : undefined}
                    spottedByLabel={t("card.spottedBy")}
                    rarityLabel={t("draft.rarity")}
                  />
                </Pressable>
              )}
            />
          )}
        </>
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
    justifyContent: "center",
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  deckButton: {
    position: "absolute",
    right: 16,
    bottom: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  deckButtonText: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  controls: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  search: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
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
