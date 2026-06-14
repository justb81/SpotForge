# @spotforge/ui

Geteiltes, **themebares** Design-System und Kartenrendering für die App.

## Verantwortung

- Komponenten konsumieren **Theme-Tokens** aus der aktiven `AppDefinition`
  (`theme.colors`, `theme.typography`, `theme.radius`) – so bekommt jede App ihr
  eigenes Look-&-Feel, ohne Code-Duplikat.
- Wiederverwendbare React-Native-Komponenten.
- **Kartenlayout:** Darstellung einer `Card` inkl. Seltenheits-Frames (aus
  `assets.cardFrames` der Variante), Foil-Effekt, Spotted-By-Tag, Attribut-Anzeige.

## Grenzen

Reine Präsentation. Keine Spiellogik (kommt aus `game-core`), keine Netzwerklogik,
keine fest kodierten Farben/Texte.

## Abhängigkeiten

React Native. `@spotforge/game-core` (Card-Typen), `@spotforge/app-config`
(ThemeTokens-Typ).

## Status

Gerüst.
