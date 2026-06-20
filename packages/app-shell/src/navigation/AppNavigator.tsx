// Haupt-Navigation der App: ein Inhaltsbereich + untere Tab-Leiste. Bewusst eine
// schlanke, zustandsbasierte Eigenimplementierung (kein react-navigation/expo-router) –
// die Top-Level-Bereiche sind eine feste, kleine Menge, und so bleibt die app-shell
// frei von nativen Navigations-Abhängigkeiten und gut testbar.
//
// Welche Tabs erscheinen, bestimmt die Progressive Disclosure (`visibleTabs`); der
// aktive Tab wird auf die sichtbare Menge geklemmt, falls sich der Fortschritt ändert.

import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { AppDefinition, LocaleCode } from "@spotforge/app-config";
import type { CascadeClassifier } from "@spotforge/ai-engine";
import type { AttributeDefinition, Card } from "@spotforge/game-core";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import type { PlayerProgress } from "../progression/disclosure";
import type { Preferences } from "../preferences/preferences";
import { SpotScreen } from "../screens/SpotScreen";
import { CollectionScreen } from "../screens/CollectionScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { FeatureScreen } from "../screens/FeatureScreen";
import type { Deck } from "../deck/deck";
import { TabBar } from "./TabBar";
import { resolveActiveTab, visibleTabs, type TabKey } from "./tabs";

export interface AppNavigatorProps {
  definition: AppDefinition;
  attributes: AttributeDefinition[];
  locale: LocaleCode;
  spottedBy: string;
  cascade?: CascadeClassifier;
  /** Spielfortschritt – steuert, welche Tabs/Features sichtbar sind. */
  progress: PlayerProgress;
  /** Aufgelöster Text-Resolver (Defaults ⊕ Varianten-Overrides). */
  t: TextResolver;
  /** Lokal gespeicherte Drafts (neueste zuerst) für die Sammlung (#102). */
  drafts: Card[];
  /** Speichert einen Draft lokal in der Sammlung (#102). */
  onSaveDraft: (draft: Card) => void;
  /** Entfernt einen Draft aus der Sammlung (#102). */
  onRemoveDraft: (id: string) => void;
  /** Aktuelles Deck für den Deck-Builder (#17). */
  deck: Deck;
  /** Deck-Kapazität (Basis 50 + Erweiterungen, GDD §7.2). */
  deckCapacity: number;
  /** Schaltet eine Karte ins Deck bzw. heraus (#17). */
  onToggleDeck: (id: string) => void;
  /** Aktuelle Nutzer-Einstellungen (für das Profil ▸ Einstellungen). */
  preferences: Preferences;
  /** Ändert die Nutzer-Einstellungen (z.B. Tutorial beim Start). */
  onPreferencesChange: (preferences: Preferences) => void;
}

export function AppNavigator({
  definition,
  attributes,
  locale,
  spottedBy,
  cascade,
  progress,
  t,
  drafts,
  onSaveDraft,
  onRemoveDraft,
  deck,
  deckCapacity,
  onToggleDeck,
  preferences,
  onPreferencesChange,
}: AppNavigatorProps) {
  const theme = useTheme();
  const [active, setActive] = useState<TabKey>("spot");

  // Aktiven Tab gegen den aktuellen Fortschritt absichern (z.B. wenn ein Tab
  // durch geänderte Freischaltung verschwindet).
  const resolvedActive = resolveActiveTab(active, progress);
  useEffect(() => {
    if (resolvedActive !== active) setActive(resolvedActive);
  }, [resolvedActive, active]);

  const tabs = visibleTabs(progress);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>{renderScreen(resolvedActive)}</View>
      {tabs.length > 1 ? (
        <TabBar tabs={tabs} active={resolvedActive} onSelect={setActive} t={t} />
      ) : null}
    </View>
  );

  function renderScreen(key: TabKey) {
    switch (key) {
      case "spot":
        return (
          <SpotScreen
            definition={definition}
            attributes={attributes}
            locale={locale}
            spottedBy={spottedBy}
            cascade={cascade}
            onSaveDraft={onSaveDraft}
          />
        );
      case "collection":
        return (
          <CollectionScreen
            t={t}
            attributes={attributes}
            drafts={drafts}
            onRemoveDraft={onRemoveDraft}
            deck={deck}
            deckCapacity={deckCapacity}
            onToggleDeck={onToggleDeck}
          />
        );
      case "battle":
        return <FeatureScreen t={t} titleKey="battle.title" bodyKey="battle.empty" icon="⚔" />;
      case "trade":
        return <FeatureScreen t={t} titleKey="trade.title" bodyKey="trade.empty" icon="⇄" />;
      case "profile":
        return (
          <ProfileScreen
            t={t}
            level={progress.level}
            cards={drafts}
            preferences={preferences}
            onPreferencesChange={onPreferencesChange}
          />
        );
    }
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
