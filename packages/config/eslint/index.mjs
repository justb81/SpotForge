// Geteilte ESLint-Flat-Config für das SpotForge-Monorepo.
//
// Bewusst ohne typgestützte Regeln (kein parserOptions.project), damit Lint
// schnell und über Paketgrenzen hinweg robust läuft. Wird von der Wurzel-
// `eslint.config.mjs` re-exportiert und kaskadiert so in alle Pakete.
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Generierte/fremde Artefakte nie linten.
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.expo/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Im Gerüst gibt es bewusst leere/Platzhalter-Module.
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Build-/Tooling-Konfig darf CommonJS-`require` und Node-Globals nutzen.
    files: [
      "**/*.cjs",
      "**/*.config.js",
      "**/*.config.cjs",
      "**/metro.config.js",
      "**/babel.config.js",
      "**/app.config.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
);
