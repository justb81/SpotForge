# @spotforge/ui

Geteiltes, **themebares** Design-System und Kartenrendering für die App.

## Verantwortung

- **ThemeProvider / `useTheme()`** stellen die **Theme-Tokens** der aktiven
  `AppDefinition` (`theme.colors`, `theme.typography`, `theme.radius`) per Context
  bereit – so bekommt jede App ihr eigenes Look-&-Feel, ohne Code-Duplikat.
- Wiederverwendbare React-Native-Komponenten (`Button`, `Badge`, `StatRow`).
- **Kartenlayout (`CardView`):** Seltenheits-Frame, Foil-Effekt (Level 3),
  Spotted-By-Tag und Attribut-Anzeige einer `Card`.

## Kartenrahmen (verbindlich + überschreibbar)

`packages/ui/assets/frames/{common,uncommon,rare,epic,legendary}.png` sind die
**generische Baseline für alle Apps** (rein rarity-gefärbt, kategorie-neutral;
reproduzierbar über [`tools/gen-ui-frames.py`](../../tools/gen-ui-frames.py)).
Eine Variante überschreibt einzelne Stufen optional über
`AppDefinition.assets.cardFrames`.

`resolveCardFrames(overrides?)` legt die Overrides über die Defaults und liefert
eine **vollständige** Frame-Map (jede Stufe gebunden). Der Host ruft das einmal
beim Variant-Wiring auf und reicht das Ergebnis als `frames`-Prop an `CardView` –
die App hat dadurch zur Build-Zeit immer alle Frames verbindlich gebunden, ohne
Laufzeit-Fallback.

## Grenzen

Reine Präsentation. Keine Spiellogik (kommt aus `game-core`), keine Netzwerklogik,
keine fest kodierten Farben/Texte. Komponenten müssen innerhalb eines
`<ThemeProvider>` liegen.

## Abhängigkeiten

React Native. `@spotforge/game-core` (Card-/Attribut-Typen, `Rarity`),
`@spotforge/app-config` (`ThemeTokens`-Typ).
