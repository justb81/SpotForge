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
import branding from "../../variants/cars/branding.config";

export default function App() {
  return (
    <SpotForgeApp
      definition={appDefinition}
      theme={branding.theme}
      attributes={CATEGORY_ATTRIBUTES}
    />
  );
}
```

Der echte Host (`apps/mobile`) reicht zusätzlich die geladene KI-Kaskade und – sobald
vorhanden – den persistierten `initialProgress` herein.

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

## App-Gerüst: Navigation, Onboarding & Progressive Disclosure (#14)

`SpotForgeApp` steuert den obersten Ablauf und hostet das Theme (`ThemeProvider`):

- **First-Time-User-Experience** (`FtueFlow`, GDD §11.1): Ein neuer Spieler
  (`progress.ftueCompleted === false`) durchläuft zuerst eine kurze, geführte
  Sequenz durch den Core Loop – Willkommen → erster Spot → **Schmiede-Animation**
  → Duell → Tausch → Starter-Karten. Bewusst „kein langer Tutorial-Text": pro
  Slide ein Glyph, ein Titel, ein Satz, plus Fortschrittspunkte und Überspringen.
  Die Sequenzlogik ist rein (`ftue/steps.ts`) und getestet.
- **Tab-Navigation** (`AppNavigator` + `TabBar`): danach die Haupt-Bereiche
  **Spot, Sammlung, Duell, Tausch, Profil**. Schlanke, zustandsbasierte
  Eigenimplementierung (keine nativen Navigations-Deps), barrierearm
  (`tablist`/`tab`, Selektion, Mindest-Touch-Target). Der Spot-Tab ist der unten
  beschriebene `SpotScreen`; die übrigen Bereiche sind generische Empty-State-
  Platzhalter (`FeatureScreen`), bis ihre eigenen Issues sie füllen.
- **Progressive Disclosure** (`progression/disclosure.ts`, GDD §11.2): Der
  Kern-Loop (Spotten) ist sofort verfügbar; Sammlung/Duell/Tausch/Profil
  schalten nach der FTUE frei; Spezial-Mechaniken (Fusion/Marktplatz/Clans) sind
  level-gebunden. `visibleTabs(progress)` blendet noch gesperrte Tabs aus.
- **Gemeinsame Text-Defaults** (`content/defaults.ts` + `content/text.ts`): Jede
  sichtbare Zeichenkette lebt als mehrsprachiger Default und wird über
  `AppDefinition.content` pro Variante überschrieben. Komponenten rufen nur
  `t(key)`; Auflösung ist Override ▸ Default ▸ Schlüssel. Kategorie-spezifische
  Wörter (z.B. „Marke / Modell") stehen **nicht** in der app-shell, sondern als
  Override in der Variante.

`progress` ist bewusst I/O-frei: der Host reicht `initialProgress` herein und
erhält Änderungen über `onProgressChange` (Persistenz bleibt Sache des Hosts).

## Spot-/Draft-Flow (offline, ADR 0010)

Der Spot-Tab fährt den Loop idle → capture → processing → Ergebnis:

- `SpotCamera` (Live-Vorschau, Permission-Handling, Auslöser via `expo-camera`)
  liefert die Foto-URI.
- Optional (AppDefinition `features.imageImport`): ein zweiter Button lädt über
  `pickImageFromLibrary` (`expo-image-picker`) ein **bestehendes Bild aus der
  Galerie**, das dieselbe Kette durchläuft. Test-/QA-Komfort – kein frisches Foto
  nötig, kein Upload (rein on-device).
- `createSpotter` verdrahtet `ai-engine.createSpot` mit der vom Host injizierten
  Kaskade (Gate → Feinmodell) und den Guardrails der Variante. Drei Ergebnisse:
  - **`draft`** → positive Rückmeldung + Karten-Vorschau (`@spotforge/ui` `CardView`).
    Der Draft lässt sich **bestätigen/korrigieren** (Marke/Modell) und mit
    **Attribut-Vorschlägen** versehen (`DraftPanel` + `DraftEditor`, reine Edit-Logik
    in `draft/draft-edit.ts`).
  - **`rejected`** → `rejectMessage` der Variante samt erkannter Klasse.
  - **`unrecognized`** → **manuelle Kategorisierung** (`UnrecognizedPanel`): der
    Spieler benennt das Objekt selbst → `buildManualDraft` (Freigabe/Kuratierung: #77).

Der Host injiziert `cascade` und das `attributes`-Schema der Kategorie; der
Seltenheits-Rahmen wird in `@spotforge/ui` prozedural gerendert (ADR 0015, kein
durchgereichtes `frames`-Set). Das **Forgen** (Online-Einreichung an die Schmiede + Reveal
mit autoritativer Seltenheit) ist der **Online**-Schritt und ein eigenes Issue;
es ist bewusst nicht Teil der app-shell. Vollständig offline.
