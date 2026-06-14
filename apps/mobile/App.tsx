import type { AppDefinition } from "@spotforge/app-config";
import { SpotForgeApp } from "@spotforge/app-shell";
import Constants from "expo-constants";

// Die aktive Variante wird zur Build-Zeit von app.config.ts aufgelöst und ihre
// vollständige AppDefinition in expoConfig.extra hinterlegt. So bleibt die
// Auflösung Metro-sicher (kein dynamisches require eines variablen Pfads).
const definition = Constants.expoConfig?.extra?.appDefinition as AppDefinition | undefined;

export default function App() {
  if (!definition) {
    throw new Error("AppDefinition fehlt in expoConfig.extra – APP_VARIANT/app.config.ts prüfen.");
  }
  return <SpotForgeApp definition={definition} />;
}
