# ADR 0001 – Monorepo + React Native als Basis

- **Status:** Akzeptiert
- **Datum:** 2026-06-14

## Kontext

SpotForge besteht aus Mobile-App, Backend, On-Device-KI und geteilter
Spiellogik. Das GDD nennt React Native *oder* Flutter als Mobile-Framework und
Node.js für das Backend. Die Trumpf-Spiellogik und das Kartenschema werden auf
Client *und* Server benötigt (Offline-Battle vs. autoritative PvP-Validierung).

## Entscheidung

1. **Monorepo** mit pnpm Workspaces + Turborepo.
2. **React Native + Expo** als Mobile-Framework.
3. **TypeScript end-to-end**, inkl. Backend (Fastify).

## Begründung

- Geteilte Domäne (`game-core`) kann als ein TypeScript-Package von App und
  Backend importiert werden – kein duplizierter, divergierender Regelcode.
- React Native + TS erlaubt echtes Code-Sharing mit dem Node-Backend; Flutter
  (Dart) würde die Spiellogik doppelt erzwingen.
- Atomare, übergreifende Änderungen (Regel + Client + Server) in einem Commit.
- Expo deckt die GDD-Anforderungen ab (Vision Camera, Reanimated, OTA-Updates
  für Modelle/Faktendaten).

## Konsequenzen

- Disziplin bei Modulgrenzen nötig (`game-core` bleibt frameworkfrei).
- ONNX-Runtime-Integration erfolgt über native RN-Module in `ai-engine`.
- Falls später native Performance kritisch wird, kann die App via Expo
  Dev-Client / Bare-Workflow native Module einbinden, ohne die Domäne zu berühren.
