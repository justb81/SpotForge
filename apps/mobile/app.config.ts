// tsx registriert einen TypeScript-Require-Hook. Nötig, weil Expo nur
// app.config.ts selbst transpiliert – ohne den Hook ließe sich die als
// TypeScript geschriebene Variantendefinition zur Config-Zeit nicht laden.
import "tsx/cjs";
import type { ExpoConfig } from "expo/config";

// Welche App gebaut wird, bestimmt APP_VARIANT (Default: cars, die einzige
// aktuelle Variante). Die Variante ist reine Konfiguration unter variants/.
const variant = process.env.APP_VARIANT ?? "cars";

const { default: app } = require(`../../variants/${variant}/app.definition`);

const config: ExpoConfig = {
  name: app.identity.displayName,
  slug: app.identity.slug,
  scheme: app.identity.scheme,
  icon: `../../variants/${variant}/${app.assets.icon}`.replace("/./", "/"),
  splash: {
    image: `../../variants/${variant}/${app.assets.splash}`.replace("/./", "/"),
    backgroundColor: app.theme.colors.background,
  },
  ios: { bundleIdentifier: app.identity.ios.bundleIdentifier },
  android: { package: app.identity.android.package },
  // Variante + vollständige Definition zur Laufzeit verfügbar machen. App.tsx
  // liest die Definition aus extra und reicht sie an die generische app-shell.
  extra: { appVariant: variant, appDefinition: app },
};

export default config;
