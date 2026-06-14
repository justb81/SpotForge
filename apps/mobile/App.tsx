import { useEffect, useState } from "react";
import type { AppDefinition } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import { createMobileNetClassifier, type Classifier } from "@spotforge/ai-engine";
import { Asset } from "expo-asset";
import Constants from "expo-constants";
// Gebündeltes Modell (#50). data/models/* liegt nicht im Git; `pnpm fetch-models`
// (CI vor dem Bundle, lokal vor `dev`) legt die Datei ab. Metro bündelt sie als
// Asset (assetExts in metro.config.js), expo-asset löst die lokale URI auf.
import modelAsset from "../../data/models/mobilenetv2-12.onnx";

// Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst und ihre
// vollständige AppDefinition in expoConfig.extra hinterlegt. So bleibt die
// Auflösung Metro-sicher (kein dynamisches require eines variablen Pfads).
const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;

export default function App() {
  if (!definition) {
    throw new Error("AppDefinition fehlt in expoConfig.extra – APP_VARIANT/app.config.ts prüfen.");
  }

  // Modell einmalig aus dem Bundle laden und den On-Device-Klassifikator
  // bereitstellen. Bis dahin läuft die App ohne Klassifikator (Spot-Screen
  // zeigt einen Bereitschaftshinweis). Alles on-device, kein Netz.
  const [classifier, setClassifier] = useState<Classifier>();
  useEffect(() => {
    let active = true;
    (async () => {
      const asset = Asset.fromModule(modelAsset);
      await asset.downloadAsync();
      const ready = await createMobileNetClassifier(asset.localUri ?? asset.uri);
      if (active) {
        setClassifier(ready);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return <SpotForgeApp definition={definition} classifier={classifier} />;
}
