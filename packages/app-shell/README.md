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

Gerüst. PoC #48: `SpotScreen` als Spot-Screen-Shell; `SpotForgeApp` startet
direkt dort, ohne Login/Onboarding. PoC #49: `SpotCamera` (Live-Vorschau,
Permission-Handling, Auslöser via `expo-camera`) + `preparePhotoForClassification`
(Resize auf Modell-Eingabegröße via `expo-image-manipulator`) als Übergabeformat
an die Klassifikation. `SpotScreen` orchestriert idle→capture→preview. Die
ONNX-Klassifikation (#50) und die Anzeige von Label+Konfidenz (#51) docken im
Preview-Schritt an.
