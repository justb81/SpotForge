# @spotforge/ui

Geteiltes Design-System und Kartenrendering für die App.

## Verantwortung

- Design-Tokens (Farben, Typografie, Abstände).
- Wiederverwendbare React-Native-Komponenten.
- **Kartenlayout:** visuelle Darstellung einer `Card` inkl. Seltenheits-Frames
  (C/U/R/E/L), Foil-Effekt, Spotted-By-Tag, Attribut-Anzeige.

## Grenzen

Reine Präsentation. Keine Spiellogik (kommt aus `game-core`), keine Netzwerklogik.

## Abhängigkeiten

React Native. Liest `Card`-Typen aus `@spotforge/game-core` für Props.

## Status

Gerüst.
