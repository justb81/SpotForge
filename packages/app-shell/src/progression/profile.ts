// Spieler-Profil (GDD §7.1): reine, RN-/I/O-freie Logik für das Level-Band, das
// Titel-System und die aus der Sammlung ableitbaren Statistiken. Das aktuelle
// Level liefert der {@link PlayerProgress} (siehe disclosure.ts); hier geht es um
// die **Interpretation** dieses Levels (Titel, Grenzen) und um Sammlungs-Kennzahlen.

import { RARITY_ORDER, rarityRank, type Card, type Rarity } from "@spotforge/game-core";

/** Höchstes erreichbares Level (GDD §7.1: 1–100). */
export const MAX_LEVEL = 100;
/** Niedrigstes Level eines aktiven Spielers. */
export const MIN_LEVEL = 1;

/** Klemmt ein (ggf. rohes) Level auf den gültigen, ganzzahligen Bereich [1, 100]. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(level)));
}

/** Titel-Stufen des Profils (GDD §7.1), aufsteigend nach Anspruch. */
export type PlayerTitle = "rookie" | "pro" | "expert" | "master" | "legendary";

/** Ein Titel mit dem Level, ab dem er gilt. */
export interface TitleBand {
  title: PlayerTitle;
  /** Level (inklusiv), ab dem dieser Titel getragen wird. */
  minLevel: number;
}

/**
 * Titel-Bänder (GDD §7.1: Rookie Spotter → Pro Spotter → Expert Forge →
 * Master Forge → Legendary Spotter), aufsteigend nach `minLevel`. Die Anzeige-Texte
 * sind kategorie-neutral und rebrandbar (i18n-Schlüssel `profile.title.*`).
 */
export const TITLE_BANDS: readonly TitleBand[] = [
  { title: "rookie", minLevel: 1 },
  { title: "pro", minLevel: 10 },
  { title: "expert", minLevel: 25 },
  { title: "master", minLevel: 50 },
  { title: "legendary", minLevel: 80 },
];

/** Titel für ein Level (höchstes Band, dessen `minLevel` erreicht ist). */
export function titleForLevel(level: number): PlayerTitle {
  const lvl = clampLevel(level);
  let title: PlayerTitle = TITLE_BANDS[0]!.title;
  for (const band of TITLE_BANDS) {
    if (lvl < band.minLevel) break;
    title = band.title;
  }
  return title;
}

/**
 * Nächstes noch nicht erreichtes Titel-Band (für „Nächster Titel ab Level N").
 * `undefined`, wenn bereits der höchste Titel getragen wird.
 */
export function nextTitleBand(level: number): TitleBand | undefined {
  const lvl = clampLevel(level);
  return TITLE_BANDS.find((band) => band.minLevel > lvl);
}

/** Aus der Sammlung abgeleitete Kennzahlen (GDD §7.1). */
export interface CollectionStats {
  /** Anzahl gespotteter Objekte gesamt. */
  total: number;
  /** Davon noch ungeschmiedete Drafts. */
  drafts: number;
  /** Davon geforgte Karten. */
  forged: number;
  /** Verteilung je Seltenheit (alle Stufen vertreten, ggf. mit 0). */
  byRarity: Record<Rarity, number>;
  /**
   * Gesamtseltenheit: Summe der Stufen-Gewichte (Common = 1 … Legendary = 5). Ein
   * grobes Maß für die „Wertigkeit" der Sammlung; Drafts zählen als ihre
   * Platzhalter-Seltenheit, bis das Forgen (#81) die echte Stufe setzt.
   */
  rarityScore: number;
}

/** Berechnet die {@link CollectionStats} aus den Karten der Sammlung. Reine Funktion. */
export function collectionStats(cards: readonly Card[]): CollectionStats {
  const byRarity = Object.fromEntries(RARITY_ORDER.map((r) => [r, 0])) as Record<Rarity, number>;
  let drafts = 0;
  let rarityScore = 0;
  for (const card of cards) {
    byRarity[card.rarity] += 1;
    rarityScore += rarityRank(card.rarity) + 1;
    if (card.status === "draft") drafts += 1;
  }
  return {
    total: cards.length,
    drafts,
    forged: cards.length - drafts,
    byRarity,
    rarityScore,
  };
}
