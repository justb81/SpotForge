# @spotforge/config

Geteilte Entwickler-Konfiguration, die alle Pakete erweitern.

## Inhalt

- `tsconfig/base.json` – gemeinsame Basis (erbt von `../../tsconfig.base.json`,
  source-first: kein Emit).
- `tsconfig/library.json` – reine TS-Pakete · `tsconfig/react.json` – React-Native-
  Pakete (jsx) · `tsconfig/node.json` – Node-Apps (backend).
- `eslint/index.mjs` – ESLint-Flat-Config-Preset (typescript-eslint).
- `prettier/index.json` – Prettier-Preset.

## Nutzung

Paket-`tsconfig.json` (relativer Pfad, kein Dependency nötig):

```jsonc
{ "extends": "../config/tsconfig/library.json", "include": ["src"] }
```

ESLint/Prettier werden an der Repo-Wurzel angezogen
(`eslint.config.mjs` re-exportiert `@spotforge/config/eslint`, `.prettierrc`
referenziert `@spotforge/config/prettier`) und kaskadieren in alle Pakete.

## Status

Aktiv – Presets in Verwendung durch alle Pakete/Apps.
