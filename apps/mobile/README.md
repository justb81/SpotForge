# @spotforge/mobile

Die Spieler-App (Expo / React Native, iOS + Android).

## Verantwortung

- **Spotting:** Kamera (Vision Camera v4, Frame-Processor) zum Fotografieren.
- **Forge-Flow:** Ruft `@spotforge/ai-engine` auf, zeigt die Schmiede-Animation.
- **Kartenbibliothek:** Sammlung, Filter, Upgrades, Foil-Darstellung.
- **Battle-UI:** Trumpf-Duelle (offline gegen KI über `game-core`, online via Backend).
- **Tausch & Sozial:** Marktplatz, Direkttausch, Feed, Clans (über `api-client`).
- **Profil/Progression:** Level, Titel, Achievements, Daily Challenges.
- **Onboarding:** FTUE inkl. erstem Spot, Tutorial-Battle (GDD §11).

## Grenzen

Enthält **keine** Spielregel-Logik – die kommt aus `@spotforge/game-core`.
Rendering von Karten kommt aus `@spotforge/ui`.

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/ai-engine`, `@spotforge/api-client`,
`@spotforge/ui`.

## Stack

Expo, React Native, Reanimated 3, Lottie, Zustand (State), Vision Camera v4.

## Status

Gerüst – noch kein Expo-Projekt initialisiert. Nächster Schritt:
`pnpm create expo-app` in dieses Verzeichnis bzw. Expo-Template einrichten.
