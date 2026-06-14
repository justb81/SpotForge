# @spotforge/app-shell

Die **gesamte generische App** als wiederverwendbare Bibliothek: Navigation,
Screens und Flows für Spotting, Forge, Kartenbibliothek, Battle, Tausch, Profil
und Onboarding. Vollständig **kategorie-agnostisch** – jedes app-spezifische
Verhalten kommt aus der aktiven `AppDefinition`.

## Idee

`apps/mobile` ist nur ein dünner Expo-Host. Die eigentliche App lebt hier und
wird mit einer `AppDefinition` parametrisiert:

```ts
import { SpotForgeApp } from "@spotforge/app-shell";
import appDefinition from "../../variants/cars/app.definition";

export default function App() {
  return <SpotForgeApp definition={appDefinition} />;
}
```

## Verantwortung

- Screens & Navigation (generisch, kategorie-neutral).
- Liest aus der `AppDefinition`: Guardrails, Prompts, Theme, Texte, Assets.
- Liefert die **gemeinsamen Text-Defaults**, die `content`-Overrides ergänzen.
- Verdrahtet `ai-engine`, `api-client`, `ui` und `game-core`.

## Grenzen

Keine fest verdrahteten Kategorie-Annahmen, keine fest kodierten Texte/Farben/
Bundle-IDs. Alles Variable kommt aus `@spotforge/app-config`.

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/ai-engine`, `@spotforge/api-client`,
`@spotforge/ui`, `@spotforge/app-config`.

## Status

Gerüst.
