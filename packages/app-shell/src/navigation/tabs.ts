// Tab-Modell der generischen App: welche Haupt-Bereiche es gibt, mit welchem
// i18n-Schlüssel sie beschriftet werden und welches Feature sie freischaltet.
// Reine Daten/Logik – die Darstellung lebt in `TabBar.tsx`. Kategorie-neutral:
// Labels kommen über die Schlüssel aus DEFAULT_CONTENT bzw. den Varianten-Overrides.

import { isFeatureUnlocked, type Feature, type PlayerProgress } from "../progression/disclosure";

/** Stabile Reihenfolge der Haupt-Tabs. */
export const TAB_KEYS = ["spot", "collection", "battle", "trade", "profile"] as const;

export type TabKey = (typeof TAB_KEYS)[number];

export interface TabDefinition {
  key: TabKey;
  /** i18n-Schlüssel des Tab-Labels (Default in DEFAULT_CONTENT; Variante kann überschreiben). */
  labelKey: string;
  /** Feature, das dieses Tab sichtbar macht (Progressive Disclosure). */
  feature: Feature;
  /** Kategorie-neutrales UI-Glyph für die Tab-Leiste. */
  icon: string;
}

/**
 * Die Haupt-Tabs. Sammlung/Duell/Tausch/Profil teilen sich Label-Schlüssel mit
 * ihren Screen-Titeln (`*.title`), damit eine Variante den Bereich mit **einem**
 * Override umbenennt (z.B. cars: `collection.title` → „Garage").
 */
export const TABS: readonly TabDefinition[] = [
  { key: "spot", labelKey: "nav.spot", feature: "spot", icon: "◎" },
  { key: "collection", labelKey: "collection.title", feature: "collection", icon: "▦" },
  { key: "battle", labelKey: "battle.title", feature: "battle", icon: "⚔" },
  { key: "trade", labelKey: "trade.title", feature: "trade", icon: "⇄" },
  { key: "profile", labelKey: "profile.title", feature: "profile", icon: "◍" },
];

/** Tabs, die für den gegebenen Fortschritt sichtbar sind. */
export function visibleTabs(progress: PlayerProgress): TabDefinition[] {
  return TABS.filter((tab) => isFeatureUnlocked(tab.feature, progress));
}

/**
 * Stellt sicher, dass der aktive Tab erlaubt ist. Verschwindet ein Tab durch
 * geänderten Fortschritt, fällt die Auswahl auf den ersten sichtbaren Tab zurück.
 */
export function resolveActiveTab(active: TabKey, progress: PlayerProgress): TabKey {
  const visible = visibleTabs(progress);
  return visible.some((tab) => tab.key === active) ? active : (visible[0]?.key ?? "spot");
}
