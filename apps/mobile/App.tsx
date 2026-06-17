import { Component, type ReactNode, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import type { AppDefinition, Branding } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import {
  createCascadeClassifier,
  gateConfigFromAppDefinition,
  type CascadeClassifier,
} from "@spotforge/ai-engine";
import { initExecutorch } from "react-native-executorch";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher";
import Constants from "expo-constants";
// Gebündeltes ExecuTorch-Modell (#50, EfficientNet-V2-S int8). data/models/*
// liegt nicht im Git; `pnpm fetch-models` (CI vor dem Bundle, lokal vor `dev`)
// legt die Datei ab. Metro bündelt sie als Asset (assetExts in metro.config.js).
import modelAsset from "../../data/models/efficientnet_v2_s_int8.pte";
// Generische Seltenheits-Kartenrahmen (variants/_default, ADR 0011) – statisch
// gebündelt; Metro liefert je Import eine Asset-ID (ImageSourcePropType).
import commonFrame from "../../variants/_default/assets/frames/common.png";
import uncommonFrame from "../../variants/_default/assets/frames/uncommon.png";
import rareFrame from "../../variants/_default/assets/frames/rare.png";
import epicFrame from "../../variants/_default/assets/frames/epic.png";
import legendaryFrame from "../../variants/_default/assets/frames/legendary.png";
// Attribut-Schema je Kategorie (Source of Truth: data/categories/<id>.json). Statisch
// gebündelt, da Metro keine dynamischen require-Pfade auflöst; die aktive Kategorie
// wählt die App über definition.category.primary.
import vehiclesCategory from "../../data/categories/vehicles.json";

const APP_VERSION = Constants.expoConfig?.version ?? "?";

// Vollständige Frame-Map (alle Stufen gebunden), die CardView je Karte indexiert.
const CARD_FRAMES = {
  common: commonFrame,
  uncommon: uncommonFrame,
  rare: rareFrame,
  epic: epicFrame,
  legendary: legendaryFrame,
};

// Attribut-Schemata der bündelbaren Kategorien (aktuell nur die Auto-Kategorie).
const CATEGORY_ATTRIBUTES: Record<string, (typeof vehiclesCategory)["attributes"]> = {
  vehicles: vehiclesCategory.attributes,
};

/**
 * Fängt Render-/Startfehler ab und zeigt sie **auf dem Bildschirm** an, statt die
 * App still zu schließen. Im Standalone-Release-Build gibt es kein Metro-Overlay –
 * ohne diese Boundary wäre ein Startfehler nur ein wortloser Sofort-Absturz.
 */
class StartupErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <SafeAreaView style={styles.errorRoot}>
          <ScrollView contentContainerStyle={styles.errorContent}>
            <Text style={styles.errorTitle}>Startfehler</Text>
            <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
            <Text style={styles.errorText}>{error.stack ?? String(error)}</Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function Root() {
  // Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst; ihre
  // AppDefinition und das aufgelöste Branding (Basis ⊕ Variante, ADR 0011) liegen
  // in expoConfig.extra.
  const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;
  const branding = Constants.expoConfig?.extra?.appBranding as Branding | undefined;

  // ExecuTorch initialisieren und aus dem gebündelten Modell die Zwei-Stufen-
  // Kaskade (Gate → Feinmodell) bauen, mit der die app-shell den Spot-Flow fährt.
  // Bis sie bereit ist, zeigt der Spot-Screen einen Lade-Hinweis; Ladefehler werden
  // sichtbar gemacht statt verschluckt.
  const [cascade, setCascade] = useState<CascadeClassifier>();
  const [modelError, setModelError] = useState<string>();
  useEffect(() => {
    if (!definition) return;
    let active = true;
    (async () => {
      try {
        initExecutorch({ resourceFetcher: ExpoResourceFetcher });
        const { createClassifier } = await import("@spotforge/ai-engine");
        // PoC-Basismodell: eingebautes ImageNet-EfficientNet (grobe Klassen). Es
        // dient zugleich als Gate und – mangels eigenem Feinmodell – als Feinmodell.
        // Das fahrzeug-spezifische Modell (#9) löst Letzteres als `kind: "custom"`
        // mit eigenem Label-Satz ab, sobald es exportiert/gebündelt ist.
        const ready = await createClassifier({
          kind: "imagenet-efficientnet-v2-s",
          modelSource: modelAsset,
        });
        if (active) {
          setCascade(
            createCascadeClassifier({
              gate: ready,
              gateConfig: gateConfigFromAppDefinition(definition),
              initFine: async () => ready,
            }),
          );
        }
      } catch (e) {
        if (active) {
          setModelError(e instanceof Error ? (e.stack ?? e.message) : String(e));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [definition]);

  if (!definition || !branding) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>AppDefinition/Branding fehlt</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>
            Constants.expoConfig.extra.appDefinition/appBranding ist im Build nicht verfügbar.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (modelError) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>Modell-Ladefehler</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>{modelError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SpotForgeApp
      definition={definition}
      theme={branding.theme}
      frames={CARD_FRAMES}
      attributes={CATEGORY_ATTRIBUTES[definition.category.primary] ?? []}
      cascade={cascade}
    />
  );
}

export default function App() {
  return (
    <StartupErrorBoundary>
      <Root />
    </StartupErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: "#1a0000",
  },
  errorContent: {
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: "#ff5555",
    fontSize: 20,
    fontWeight: "700",
  },
  errorVersion: {
    color: "#ff9999",
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: "#ffdddd",
    fontSize: 12,
    fontFamily: "monospace",
  },
});
