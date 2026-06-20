// Profil-Screen (GDD §7.1): zeigt Level, Titel und die aus der Sammlung
// abgeleiteten Statistiken. Kategorie-neutral und themebar; alle Texte über den
// TextResolver. Reine Anzeige – Level kommt aus dem Fortschritt, Kennzahlen aus
// der Sammlung (`collectionStats`).

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RARITY_ORDER, type Card } from "@spotforge/game-core";
import { rarityStyle, useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import {
  clampLevel,
  collectionStats,
  nextTitleBand,
  titleForLevel,
} from "../progression/profile";

export interface ProfileScreenProps {
  t: TextResolver;
  /** Aktuelles Spieler-Level (wird auf 1–100 geklemmt angezeigt). */
  level: number;
  /** Die Sammlung des Spielers (Drafts + geforgte Karten) für die Kennzahlen. */
  cards: Card[];
}

export function ProfileScreen({ t, level, cards }: ProfileScreenProps) {
  const theme = useTheme();
  const displayLevel = clampLevel(level);
  const title = titleForLevel(displayLevel);
  const next = nextTitleBand(displayLevel);
  const stats = collectionStats(cards);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        accessibilityRole="header"
        style={[styles.header, { borderBottomColor: theme.colors.surface }]}
      >
        <Text style={[styles.title, { color: theme.colors.primary }]}>{t("profile.title")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Level + Titel */}
        <View style={[styles.hero, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.levelLabel, { color: theme.colors.accent }]}>
            {t("profile.level", { level: displayLevel })}
          </Text>
          <Text style={[styles.titleName, { color: theme.colors.text }]}>
            {t(`profile.title.${title}`)}
          </Text>
          {next ? (
            <Text style={[styles.nextTitle, { color: theme.colors.text }]}>
              {t("profile.nextTitle", {
                title: t(`profile.title.${next.title}`),
                level: next.minLevel,
              })}
            </Text>
          ) : (
            <Text style={[styles.nextTitle, { color: theme.colors.text }]}>
              {t("profile.maxTitle")}
            </Text>
          )}
        </View>

        {/* Kennzahlen */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t("profile.stats")}
        </Text>
        <View style={styles.statGrid}>
          <Stat
            value={stats.total}
            label={t("profile.stat.spotted")}
            color={theme.colors.text}
            accent={theme.colors.primary}
            surface={theme.colors.surface}
          />
          <Stat
            value={stats.forged}
            label={t("profile.stat.forged")}
            color={theme.colors.text}
            accent={theme.colors.primary}
            surface={theme.colors.surface}
          />
          <Stat
            value={stats.rarityScore}
            label={t("profile.stat.rarityScore")}
            color={theme.colors.text}
            accent={theme.colors.primary}
            surface={theme.colors.surface}
          />
        </View>

        {/* Seltenheits-Verteilung */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t("profile.byRarity")}
        </Text>
        <View style={[styles.rarityList, { backgroundColor: theme.colors.surface }]}>
          {RARITY_ORDER.map((rarity) => (
            <View key={rarity} style={styles.rarityRow}>
              <View style={[styles.rarityDot, { backgroundColor: rarityStyle(rarity).color }]} />
              <Text style={[styles.rarityLabel, { color: theme.colors.text }]}>
                {t(`rarity.${rarity}`)}
              </Text>
              <Text style={[styles.rarityCount, { color: theme.colors.text }]}>
                {stats.byRarity[rarity]}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({
  value,
  label,
  color,
  accent,
  surface,
}: {
  value: number;
  label: string;
  color: string;
  accent: string;
  surface: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: surface }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]} numberOfLines={2}>
        {label}
      </Text>
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
  body: {
    padding: 16,
    gap: 16,
  },
  hero: {
    borderRadius: 16,
    padding: 20,
    gap: 4,
    alignItems: "center",
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleName: {
    fontSize: 26,
    fontWeight: "800",
  },
  nextTitle: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  statGrid: {
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
  },
  rarityList: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rarityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  rarityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rarityLabel: {
    flex: 1,
    fontSize: 15,
  },
  rarityCount: {
    fontSize: 15,
    fontWeight: "700",
  },
});
