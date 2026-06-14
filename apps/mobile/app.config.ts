// tsx registriert einen TypeScript-Require-Hook. Nötig, weil Expo nur
// app.config.ts selbst transpiliert – ohne den Hook ließe sich die als
// TypeScript geschriebene Variantendefinition zur Config-Zeit nicht laden.
import "tsx/cjs";
import type { ExpoConfig } from "expo/config";

// Welche App gebaut wird, bestimmt APP_VARIANT (Default: cars, die einzige
// aktuelle Variante). Die Variante ist reine Konfiguration unter variants/.
const variant = process.env.APP_VARIANT ?? "cars";

const { default: app } = require(`../../variants/${variant}/app.definition`);

// Eindeutige Version je Test-Build: die CI-Run-Nummer fließt in versionName und
// versionCode, damit sich aufeinanderfolgende APKs unterscheiden und sauber
// über eine vorige Installation aktualisieren lassen. Lokal Fallback auf Basis.
const buildNumber = process.env.GITHUB_RUN_NUMBER ? Number(process.env.GITHUB_RUN_NUMBER) : 0;
const baseVersion = "0.1.0";
const version = buildNumber > 0 ? `${baseVersion}-build.${buildNumber}` : baseVersion;

// expo-dev-client gehört nur in den echten Development Build (Expo Go ist kein
// Ziel). Im eigenständigen Test-/Release-APK (gradlew assembleRelease) ist der
// Dev-Launcher unerwünscht – er wird nur bei EXPO_USE_DEV_CLIENT=1 eingebunden.
const useDevClient = process.env.EXPO_USE_DEV_CLIENT === "1";

const config: ExpoConfig = {
  name: app.identity.displayName,
  slug: app.identity.slug,
  scheme: app.identity.scheme,
  version,
  icon: `../../variants/${variant}/${app.assets.icon}`.replace("/./", "/"),
  splash: {
    image: `../../variants/${variant}/${app.assets.splash}`.replace("/./", "/"),
    backgroundColor: app.theme.colors.background,
  },
  ios: { bundleIdentifier: app.identity.ios.bundleIdentifier, buildNumber: String(buildNumber) },
  android: { package: app.identity.android.package, versionCode: Math.max(buildNumber, 1) },
  // Config-Plugins: expo-camera für den Capture (#49); expo-dev-client nur im
  // Development Build. ONNX (#50) braucht kein Plugin (autolinked).
  plugins: [
    ...(useDevClient ? ["expo-dev-client"] : []),
    [
      "expo-camera",
      {
        cameraPermission: `${app.identity.displayName} nutzt die Kamera, um Objekte zu spotten und Karten zu schmieden.`,
      },
    ],
  ],
  // Variante + vollständige Definition zur Laufzeit verfügbar machen. App.tsx
  // liest die Definition aus extra und reicht sie an die generische app-shell.
  extra: { appVariant: variant, appDefinition: app },
};

export default config;
