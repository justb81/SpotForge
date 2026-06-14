import { Component, type ReactNode, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import type { Classifier } from "@spotforge/ai-engine";
import { initExecutorch } from "react-native-executorch";
import { ExpoResourceFetcher } from "react-native-executorch-expo-resource-fetcher";
import Constants from "expo-constants";
// Gebündeltes ExecuTorch-Modell (#50, EfficientNet-V2-S int8). data/models/*
// liegt nicht im Git; `pnpm fetch-models` (CI vor dem Bundle, lokal vor `dev`)
// legt die Datei ab. Metro bündelt sie als Asset (assetExts in metro.config.js).
import modelAsset from "../../data/models/efficientnet_v2_s_int8.pte";

const APP_VERSION = Constants.expoConfig?.version ?? "?";

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
  // Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst und ihre
  // vollständige AppDefinition in expoConfig.extra hinterlegt.
  const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;

  // ExecuTorch initialisieren und den On-Device-Klassifikator aus dem gebündelten
  // Modell bereitstellen. Bis er bereit ist, zeigt der Spot-Screen einen
  // Lade-Hinweis; Ladefehler werden sichtbar gemacht statt verschluckt.
  const [classifier, setClassifier] = useState<Classifier>();
  const [modelError, setModelError] = useState<string>();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        initExecutorch({ resourceFetcher: ExpoResourceFetcher });
        const { createClassifier } = await import("@spotforge/ai-engine");
        const ready = await createClassifier(modelAsset);
        if (active) {
          setClassifier(ready);
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
  }, []);

  if (!definition) {
    return (
      <SafeAreaView style={styles.errorRoot}>
        <ScrollView contentContainerStyle={styles.errorContent}>
          <Text style={styles.errorTitle}>AppDefinition fehlt</Text>
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>
            Constants.expoConfig.extra.appDefinition ist im Build nicht verfügbar.
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

  return <SpotForgeApp definition={definition} classifier={classifier} />;
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
