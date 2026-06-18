// Das visuelle Kartenlayout (GDD §4.2, §7.3, §10.1) im Trumpf-/Quartett-Stil:
// prozedural gerenderter Seltenheits-Frame (CardFrame, SVG) als Hintergrund,
// Objektname + Rarity-Badge, Card-Art im oberen Bereich und – gleichberechtigt –
// ein prominenter **Werte-Block** mit den Kategorie-Attributen (die Werte sind Teil
// der Karte, nicht nur das Foto). Dazu der Spotted-By-Tag und – für Foil-Karten –
// ein Schimmer-Overlay. Alle Farben/Schriften kommen aus dem ThemeProvider;
// dieselbe Card sieht so je Variante anders aus, ohne Code-Duplikat. Muss innerhalb
// eines <ThemeProvider> liegen.

import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { isFoil } from "@spotforge/game-core";
import { DEFAULT_RADIUS, useTheme } from "../theme/ThemeProvider";
import { Badge } from "../components/Badge";
import { StatRow } from "../components/StatRow";
import { CardFrame } from "./CardFrame";
import { lighten } from "./color";
import { FoilOverlay } from "./FoilOverlay";
import { rarityStyle } from "./rarity-style";
import { toStatDisplays } from "./stat";

export interface CardViewProps {
  /** Die darzustellende Karte. */
  card: Card;
  /** Attribut-Schema der Kategorie (Labels/Einheiten/trumpfbar) – Quelle der Anzeige-Reihenfolge. */
  attributes: AttributeDefinition[];
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
  artSource,
  spottedByLabel = "Gespottet von",
  rarityLabel,
  highlightedAttribute,
}: CardViewProps) {
  const theme = useTheme();
  const rarity = rarityStyle(card.rarity);
  const radius = theme.radius ?? DEFAULT_RADIUS;
  // Alle Kategorie-Attribute zeigen – fehlende Werte (z.B. frischer Draft) als
  // Platzhalter, damit die Karte stets die vollständige Werte-Struktur vermittelt.
  const stats = toStatDisplays(card.attributes, attributes, { includeMissing: true });
  const art = artSource ?? (card.artUri !== undefined ? { uri: card.artUri } : undefined);
  // Der gerenderte Rahmen hat einen hellen Karten-Body → On-Card-Text (Titel,
  // Stats, Spotted-By) wird in der dunklen Theme-Tinte gesetzt, nicht in der
  // UI-Textfarbe (die für den dunklen App-Hintergrund hell ist).
  const ink = theme.colors.secondary;
  // Weiche, stufengetönte Linien für den Werte-Block (Quartett-Look).
  const divider = lighten(ink, 0.78);
  const panelBorder = lighten(rarity.color, 0.35);

  return (
    <View style={[styles.root, { borderRadius: radius }]}>
      {/* Prozedural gerenderter Seltenheits-Frame als Hintergrund (SVG, #96):
          auflösungsunabhängig, randscharf; den runden Eck-Clip übernimmt das root
          (overflow:hidden + borderRadius). */}
      <CardFrame rarity={card.rarity} radius={radius} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: ink,
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

        {/* Werte-Block: gleichberechtigt zum Foto. Die Zeilen verteilen sich über
            die Block-Höhe (Quartett-Look); fehlende Werte erscheinen als Platzhalter. */}
        <View style={[styles.stats, { borderColor: panelBorder, borderRadius: radius / 2 }]}>
          {stats.map((stat, i) => (
            <View
              key={stat.key}
              style={[
                styles.statRowWrap,
                i < stats.length - 1
                  ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: divider }
                  : null,
              ]}
            >
              <StatRow stat={stat} color={ink} highlighted={stat.key === highlightedAttribute} />
            </View>
          ))}
        </View>

        <Text numberOfLines={1} style={[styles.spottedBy, { color: ink }]}>
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
    gap: 8,
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
    // Foto im oberen Bereich; der Werte-Block darunter ist gleichberechtigt.
    flex: 4,
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
    flex: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  statRowWrap: {
    flex: 1,
    justifyContent: "center",
  },
  spottedBy: {
    fontSize: 12,
    opacity: 0.7,
  },
});
