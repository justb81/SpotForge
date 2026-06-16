// Das visuelle Kartenlayout (GDD §4.2, §7.3, §10.1): Seltenheits-Frame als
// Hintergrund, Objektname + Rarity-Badge, Card-Art, Attribut-Reihen, Spotted-By-
// Tag und – für Foil-Karten – ein Schimmer-Overlay. Alle Farben/Schriften kommen
// aus dem ThemeProvider; dieselbe Card sieht so je Variante anders aus, ohne
// Code-Duplikat. Muss innerhalb eines <ThemeProvider> liegen.

import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { isFoil } from "@spotforge/game-core";
import { DEFAULT_RADIUS, useTheme } from "../theme/ThemeProvider";
import { Badge } from "../components/Badge";
import { StatRow } from "../components/StatRow";
import { FoilOverlay } from "./FoilOverlay";
import type { ResolvedCardFrames } from "./frames";
import { rarityStyle } from "./rarity-style";
import { toStatDisplays } from "./stat";

export interface CardViewProps {
  /** Die darzustellende Karte. */
  card: Card;
  /** Attribut-Schema der Kategorie (Labels/Einheiten/trumpfbar) – Quelle der Anzeige-Reihenfolge. */
  attributes: AttributeDefinition[];
  /**
   * Vollständige, zur Build-/Wiring-Zeit aufgelöste Frame-Map (generische
   * Defaults ∪ Varianten-Overrides), siehe {@link resolveCardFrames}.
   */
  frames: ResolvedCardFrames;
  /** Card-Art-Bild; ohne Angabe wird `card.artUri` genutzt, sonst ein Platzhalter. */
  artSource?: ImageSourcePropType;
  /** Label vor dem Entdecker-Tag (z.B. lokalisiert); Default sprachneutral. */
  spottedByLabel?: string;
  /** Überschreibt das Rarity-Badge-Label (z.B. lokalisiert). */
  rarityLabel?: string;
  /** Hervorgehobenes Attribut (z.B. gewählte Trumpf-Auswahl). */
  highlightedAttribute?: string;
}

export function CardView({
  card,
  attributes,
  frames,
  artSource,
  spottedByLabel = "Gespottet von",
  rarityLabel,
  highlightedAttribute,
}: CardViewProps) {
  const theme = useTheme();
  const rarity = rarityStyle(card.rarity);
  const radius = theme.radius ?? DEFAULT_RADIUS;
  const stats = toStatDisplays(card.attributes, attributes);
  const art = artSource ?? (card.artUri !== undefined ? { uri: card.artUri } : undefined);

  return (
    <View style={[styles.root, { borderRadius: radius }]}>
      <Image
        source={frames[card.rarity]}
        resizeMode="stretch"
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.headingFontFamily ?? theme.typography.fontFamily,
              },
            ]}
          >
            {card.objectName}
          </Text>
          <Badge
            label={rarityLabel ?? rarity.label}
            color={rarity.color}
            textColor={theme.colors.secondary}
          />
        </View>

        <View
          style={[styles.art, { backgroundColor: theme.colors.surface, borderRadius: radius / 2 }]}
        >
          {art ? (
            <Image source={art} resizeMode="cover" style={styles.artImage} />
          ) : (
            <Text numberOfLines={2} style={[styles.artPlaceholder, { color: theme.colors.text }]}>
              {card.objectName}
            </Text>
          )}
        </View>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <StatRow key={stat.key} stat={stat} highlighted={stat.key === highlightedAttribute} />
          ))}
        </View>

        <Text numberOfLines={1} style={[styles.spottedBy, { color: theme.colors.text }]}>
          {spottedByLabel} {card.spottedBy}
        </Text>
      </View>

      {isFoil(card) ? <FoilOverlay /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    aspectRatio: 5 / 7,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: "7%",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  art: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  artImage: {
    width: "100%",
    height: "100%",
  },
  artPlaceholder: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.6,
    textAlign: "center",
  },
  stats: {
    gap: 2,
  },
  spottedBy: {
    fontSize: 12,
    opacity: 0.7,
  },
});
