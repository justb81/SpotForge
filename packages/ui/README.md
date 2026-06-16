# @spotforge/ui

Geteiltes, **themebares** Design-System und Kartenrendering für die App.

## Verantwortung

- **ThemeProvider / `useTheme()`** stellen die **Theme-Tokens** der aktiven
  `AppDefinition` (`theme.colors`, `theme.typography`, `theme.radius`) per Context
  bereit – so bekommt jede App ihr eigenes Look-&-Feel, ohne Code-Duplikat.
- Wiederverwendbare React-Native-Komponenten (`Button`, `Badge`, `StatRow`).
- **Kartenlayout (`CardView`):** Seltenheits-Frame, Foil-Effekt (Level 3),
  Spotted-By-Tag und Attribut-Anzeige einer `Card`.

## Kartenrahmen

`CardView` bekommt eine **vollständige** `frames`-Map (`ResolvedCardFrames`) als
Prop. Die generischen Default-Rahmen sind **keine** ui-Assets, sondern Teil des
Brandings der Basis-Variante `variants/_default/assets/frames/` (ADR 0011);
Varianten überschreiben einzelne Stufen über ihre `branding.config.ts`. Der
Build-Host löst das Branding auf (`resolveBranding`) und reicht die fertige Map
durch – `ui` bleibt rein und liest selbst keine Assets aus `variants/`.

`mergeCardFrames(defaults, overrides?)` ist die reine Hilfsfunktion, mit der der
Host eine vollständige Map aus Defaults + Overrides bildet.

## Grenzen

Reine Präsentation. Keine Spiellogik (kommt aus `game-core`), keine Netzwerklogik,
keine fest kodierten Farben/Texte. Komponenten müssen innerhalb eines
`<ThemeProvider>` liegen.

## Abhängigkeiten

React Native. `@spotforge/game-core` (Card-/Attribut-Typen, `Rarity`),
`@spotforge/app-config` (`ThemeTokens`-Typ).
