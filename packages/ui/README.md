# @spotforge/ui

Geteiltes, **themebares** Design-System und Kartenrendering für die App.

## Verantwortung

- **ThemeProvider / `useTheme()`** stellen die **Theme-Tokens** der aktiven
  `AppDefinition` (`theme.colors`, `theme.typography`, `theme.radius`) per Context
  bereit – so bekommt jede App ihr eigenes Look-&-Feel, ohne Code-Duplikat.
- Wiederverwendbare React-Native-Komponenten (`Button`, `Badge`, `StatRow`).
- **Kartenlayout (`CardView`):** prozedural gerenderter Seltenheits-Rahmen,
  Foil-Effekt (Level 3), Spotted-By-Tag und Attribut-Anzeige einer `Card`.

## Kartenrahmen (prozedural, SVG)

Der Seltenheits-Rahmen wird **gerendert, nicht gebündelt** (ADR 0015, #96):
`CardFrame` zeichnet mit `react-native-svg` Rahmenring, Stufen-Glow, hellen
Karten-Body, eine theme-getönte Innenlinie und Edelstein-Ornamente –
auflösungsunabhängig (5:7) und **ohne Frame-Assets**.

- **`RARITY_STYLES` ist die einzige Farbquelle** der Stufe (Badge **und** Rahmen).
- `cardFrameSpec(rarity)` ist die reine, getestete Ableitung Stufe → Geometrie
  (Rahmenbreite, Glow-Ringe, Edelstein-Größe, Eck-Ornamente ab Rare) – C/U/R/E/L
  bleiben so auch über die Form unterscheidbar.
- **Theme-Tönung statt Asset-Override:** Innenlinie (`theme.colors.primary`) und
  Eckenradius (`theme.radius`) machen den Rahmen pro Variante rebrandbar.
- **Foil** rendert `FoilOverlay` als diagonalen SVG-Schimmer im selben Ansatz.

`CardView` nimmt **kein** `frames`-Prop mehr; es genügt, die Karte innerhalb eines
`<ThemeProvider>` zu rendern.

## Grenzen

Reine Präsentation. Keine Spiellogik (kommt aus `game-core`), keine Netzwerklogik,
keine fest kodierten Farben/Texte. Komponenten müssen innerhalb eines
`<ThemeProvider>` liegen.

## Abhängigkeiten

React Native, `react-native-svg` (Rahmen-/Foil-Rendering).
`@spotforge/game-core` (Card-/Attribut-Typen, `Rarity`), `@spotforge/app-config`
(`ThemeTokens`-Typ).
