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
import type { AttributeDefinition } from "@spotforge/game-core";
import { useTheme } from "@spotforge/ui";
import type { TextResolver } from "../content/text";
import type { PlayerProgress } from "../progression/disclosure";
import { SpotScreen } from "../screens/SpotScreen";
import { FeatureScreen } from "../screens/FeatureScreen";
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
}

export function AppNavigator({
  definition,
  attributes,
  locale,
  spottedBy,
  cascade,
  progress,
  t,
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
          />
        );
      case "collection":
        return (
          <FeatureScreen t={t} titleKey="collection.title" bodyKey="collection.empty" icon="▦" />
        );
      case "battle":
        return <FeatureScreen t={t} titleKey="battle.title" bodyKey="battle.empty" icon="⚔" />;
      case "trade":
        return <FeatureScreen t={t} titleKey="trade.title" bodyKey="trade.empty" icon="⇄" />;
      case "profile":
        return <FeatureScreen t={t} titleKey="profile.title" bodyKey="profile.empty" icon="◍" />;
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
