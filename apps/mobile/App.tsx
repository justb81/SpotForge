import { Component, type ReactNode, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import type { AppDefinition } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import type { Classifier } from "@spotforge/ai-engine";
import { Asset } from "expo-asset";
import Constants from "expo-constants";
// Gebündeltes Modell (#50). data/models/* liegt nicht im Git; `pnpm fetch-models`
// (CI vor dem Bundle, lokal vor `dev`) legt die Datei ab. Metro bündelt sie als
// Asset (assetExts in metro.config.js), expo-asset löst die lokale URI auf.
import modelAsset from "../../data/models/mobilenetv2-12.onnx";

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

const tick = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

function Root() {
  // Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst und ihre
  // vollständige AppDefinition in expoConfig.extra hinterlegt.
  const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;

  // Modell laden und Klassifikator bereitstellen. Der native ONNX-Crash lässt
  // sich ohne logcat nur per „printf auf den Bildschirm" lokalisieren: jeder
  // Schritt aktualisiert `status`; der zuletzt sichtbare Schritt vor dem Schließen
  // markiert die Crash-Stelle. Kurze Pausen, damit React den Schritt rendert.
  const [classifier, setClassifier] = useState<Classifier>();
  const [modelError, setModelError] = useState<string>();
  const [status, setStatus] = useState("Start…");
  useEffect(() => {
    let active = true;
    const set = (s: string) => {
      if (active) setStatus(s);
    };
    (async () => {
      try {
        set("1/5 ai-engine laden…");
        await tick();
        const { createMobileNetClassifier } = await import("@spotforge/ai-engine");

        set("2/5 Asset auflösen…");
        await tick();
        const asset = Asset.fromModule(modelAsset);
        await asset.downloadAsync();

        const uri = asset.localUri ?? asset.uri;
        set(`3/5 Asset downloaded=${asset.downloaded} uri=${uri ?? "null"}`);
        await tick(2000);

        set("4/5 InferenceSession erstellen…");
        await tick(1500);
        const ready = await createMobileNetClassifier(uri);

        set("5/5 bereit ✓");
        if (active) setClassifier(ready);
      } catch (e) {
        if (active) setModelError(e instanceof Error ? (e.stack ?? e.message) : String(e));
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
          <Text style={styles.errorVersion}>v{APP_VERSION}</Text>
          <Text style={styles.errorText}>{modelError}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Diagnose-Overlay: zeigt Version + aktuellen Lade-Schritt über der App. Der
  // letzte sichtbare Schritt vor einem nativen Crash lokalisiert die Ursache.
  return (
    <View style={styles.appRoot}>
      <SpotForgeApp definition={definition} classifier={classifier} />
      <View style={styles.statusOverlay} pointerEvents="none">
        <Text style={styles.statusText}>
          v{APP_VERSION} · {status}
        </Text>
      </View>
    </View>
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
  appRoot: {
    flex: 1,
  },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingTop: 44,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  statusText: {
    color: "#00ff88",
    fontSize: 11,
    fontFamily: "monospace",
  },
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
