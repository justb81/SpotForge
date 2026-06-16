// @spotforge/app-config — öffentliche Einstiegspunkte (RN-tauglich, ohne I/O).
//
// AppDefinition-Schema, defineApp-Helper und Laufzeit-Validierung. Siehe README.
// Der Build-Zeit-Loader (Varianten-Auflösung, Asset-Existenz, `node:`-Importe)
// lebt separat unter `@spotforge/app-config/loader`.

export * from "./app-definition";
export * from "./branding"; // ThemeTokens, AssetManifest, Branding, defineBranding, resolveBranding, …
export * from "./schema"; // appDefinitionSchema, brandingSchema
export * from "./validate"; // validateAppDefinition, validateBranding, assertAppDefinition, AppDefinitionError, …
