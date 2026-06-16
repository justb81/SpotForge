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

Gerüst. **Spot-/Draft-Flow (offline, ADR 0010):** `SpotForgeApp` startet ohne
Login/Onboarding direkt im `SpotScreen`, der den Loop
idle → capture → processing → Ergebnis fährt:

- `SpotCamera` (Live-Vorschau, Permission-Handling, Auslöser via `expo-camera`)
  liefert die Foto-URI.
- `createSpotter` verdrahtet `ai-engine.createSpot` mit der vom Host injizierten
  Kaskade (Gate → Feinmodell) und den Guardrails der Variante. Drei Ergebnisse:
  - **`draft`** → positive Rückmeldung + Karten-Vorschau (`@spotforge/ui` `CardView`).
    Der Draft lässt sich **bestätigen/korrigieren** (Marke/Modell) und mit
    **Attribut-Vorschlägen** versehen (`DraftPanel` + `DraftEditor`, reine Edit-Logik
    in `draft/draft-edit.ts`).
  - **`rejected`** → `rejectMessage` der Variante samt erkannter Klasse.
  - **`unrecognized`** → **manuelle Kategorisierung** (`UnrecognizedPanel`): der
    Spieler benennt das Objekt selbst → `buildManualDraft` (Freigabe/Kuratierung: #77).

Der Host injiziert `cascade`, das aufgelöste `frames`-Set und das `attributes`-
Schema der Kategorie. Das **Forgen** (Online-Einreichung an die Schmiede + Reveal
mit autoritativer Seltenheit) ist der **Online**-Schritt und ein eigenes Issue;
es ist bewusst nicht Teil der app-shell. Vollständig offline.
