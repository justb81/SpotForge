import type { ExpoConfig } from "expo/config";

// Welche App gebaut wird, bestimmt APP_VARIANT (Default: cars, die einzige
// aktuelle Variante). Die Variante ist reine Konfiguration unter variants/.
const variant = process.env.APP_VARIANT ?? "cars";

// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  // Variante zur Laufzeit verfügbar machen (app-shell lädt die Definition).
  extra: { appVariant: variant },
};

export default config;
