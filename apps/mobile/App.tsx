import { Component, type ReactNode, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import type { Classifier } from "@spotforge/ai-engine";
import { Asset } from "expo-asset";
import Constants from "expo-constants";
// Gebündeltes Modell (#50). data/models/* liegt nicht im Git; `pnpm fetch-models`
// (CI vor dem Bundle, lokal vor `dev`) legt die Datei ab. Metro bündelt sie als
// Asset (assetExts in metro.config.js), expo-asset löst die lokale URI auf.
import modelAsset from "../../data/models/mobilenetv2-12.onnx";

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
            <Text style={styles.errorVersion}>v{Constants.expoConfig?.version ?? "?"}</Text>
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

  // Modell einmalig aus dem Bundle laden und den On-Device-Klassifikator
  // bereitstellen. Fehler werden sichtbar gemacht statt verschluckt.
  const [classifier, setClassifier] = useState<Classifier>();
  const [modelError, setModelError] = useState<string>();
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // ai-engine (und damit onnxruntime-react-native) bewusst erst hier
        // dynamisch laden – nicht im Startpfad. Ein Fehler im nativen ONNX-Modul
        // wird so abfangbar (sichtbarer Modell-Ladefehler) statt Sofort-Absturz.
        const { createMobileNetClassifier } = await import("@spotforge/ai-engine");
        const asset = Asset.fromModule(modelAsset);
        await asset.downloadAsync();
        const ready = await createMobileNetClassifier(asset.localUri ?? asset.uri);
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
          <Text style={styles.errorVersion}>v{Constants.expoConfig?.version ?? "?"}</Text>
          <Text style={styles.errorText}>
            Constants.expoConfig.extra.appDefinition ist im Build nicht verfügbar. expoConfig=
            {String(Constants.expoConfig != null)} keys=
            {Object.keys(Constants.expoConfig?.extra ?? {}).join(",") || "—"}
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
          <Text style={styles.errorVersion}>v{Constants.expoConfig?.version ?? "?"}</Text>
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
