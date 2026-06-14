# @spotforge/config

Geteilte Entwickler-Konfiguration, die alle Pakete erweitern.

## Inhalt

- `tsconfig.base.json`-Erweiterungen pro Zielumgebung (Node, React Native).
- ESLint- und Prettier-Konfiguration.

## Nutzung

In einem Paket-`tsconfig.json`:

```jsonc
{ "extends": "@spotforge/config/tsconfig.node.json" }
```

## Status

Gerüst – Basiskonfiguration liegt im Repo-Root (`tsconfig.base.json`);
spezialisierte Presets folgen hier.
