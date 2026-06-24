// tsx registriert einen TypeScript-Require-Hook. Nötig, weil Expo nur
// app.config.ts selbst transpiliert – ohne den Hook ließe sich die als
// TypeScript geschriebene Variantendefinition zur Config-Zeit nicht laden.
import "tsx/cjs";
import type { ExpoConfig } from "expo/config";
import { resolveBranding } from "@spotforge/app-config";

// Welche App gebaut wird, bestimmt APP_VARIANT (Default: cars, die einzige
// aktuelle Variante). Die Variante ist reine Konfiguration unter variants/.
const variant = process.env.APP_VARIANT ?? "cars";

const { default: app } = require(`../../variants/${variant}/app.definition`);

// Branding (Theme + Assets, ADR 0011): Basis-Variante `_default` ⊕ Variante. Die
// Verzeichnis-Präfixe sind relativ zu apps/mobile, damit die aufgelösten Asset-
// Pfade direkt von Expo/Metro genutzt werden können.
const { default: baseBranding } = require(`../../variants/_default/branding.config`);
const { default: variantBranding } = require(`../../variants/${variant}/branding.config`);
const branding = resolveBranding({
  base: baseBranding,
  baseDir: `../../variants/_default`,
  variant: variantBranding,
  variantDir: `../../variants/${variant}`,
});

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

// Config-Plugins: expo-camera für den Capture (#49); expo-dev-client nur im
// Development Build. expo-image-picker nur, wenn die Variante den Galerie-Import
// aktiviert (features.imageImport) – so trägt nur eine App, die das Feature
// wirklich nutzt, die Foto-Berechtigung. ExecuTorch (#50) und die MLKit-Module der
// Foto-Sanitisierung (#89, Expo-Module) brauchen kein Plugin (autolinked);
// expo-image (Abhängigkeit der MLKit-Core-Pakete) wird hier registriert.
const plugins: NonNullable<ExpoConfig["plugins"]> = [
  ...(useDevClient ? ["expo-dev-client"] : []),
  "expo-image",
  [
    "expo-camera",
    {
      cameraPermission: `${app.identity.displayName} nutzt die Kamera, um Objekte zu spotten und Karten zu schmieden.`,
    },
  ],
];
if (app.features?.imageImport) {
  plugins.push([
    "expo-image-picker",
    {
      photosPermission: `${app.identity.displayName} kann ein vorhandenes Bild aus deiner Galerie laden, um es zu spotten.`,
    },
  ]);
}

const config: ExpoConfig = {
  name: app.identity.displayName,
  slug: app.identity.slug,
  scheme: app.identity.scheme,
  version,
  icon: branding.assets.icon,
  splash: {
    image: branding.assets.splash,
    backgroundColor: branding.theme.colors.background,
  },
  ios: { bundleIdentifier: app.identity.ios.bundleIdentifier, buildNumber: String(buildNumber) },
  android: { package: app.identity.android.package, versionCode: Math.max(buildNumber, 1) },
  plugins,
  // Variante + Definition + aufgelöstes Branding zur Laufzeit verfügbar machen.
  // App.tsx liest beides aus extra und reicht es an die generische app-shell.
  extra: { appVariant: variant, appDefinition: app, appBranding: branding },
};

export default config;
