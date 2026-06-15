// @spotforge/game-core — öffentliche Einstiegspunkte.
//
// Reine, frameworkfreie Spiel- und Kartendomäne. Siehe README.md.

export * from "./category"; // CategoryId, CATEGORY_IDS, CategoryDefinition, findAttribute
export * from "./attribute"; // AttributeDefinition, AttributeKey, AttributeValues, compareAttribute
export * from "./rarity"; // Rarity, RARITY_ORDER, rarityRank, compareRarity, rarityFromPercentile, RarityInput, rarityPercentile, computeRarity
export * from "./spotting-density"; // SpottingDensityConfig, spottingDensity (lokale Dichte → appSpottingFrequency)
export * from "./ability"; // Ability, AbilityKind, ABILITY_KINDS
export * from "./card"; // Card, CardStatus, CardLevel, FOIL_LEVEL, isFoil, getAttributeValue, PLACEHOLDER_RARITY, BuildDraftInput, buildDraft

// Geplante Bereiche (noch nicht implementiert):
//   export * from "./battle";  // Trumpf-Engine, Spielmodi
//   export * from "./upgrade"; // Karten-Upgrades (Duplikate → Stufen → Foil)
