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
  (`tablist`/`tab`, Selektion, Mindest-Touch-Target). Spot, Sammlung und Profil
  sind ausgefüllt (siehe unten); **Duell** und **Tausch** sind noch generische
  Empty-State-Platzhalter (`FeatureScreen`), bis ihre eigenen Issues sie füllen.
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

## Lokale Draft-Sammlung (offline, #102)

Ein gespotteter, bestätigter/korrigierter Draft lässt sich **lokal in der Sammlung
speichern** (`DraftPanel` „In Sammlung speichern" → `SpotScreen.onSaveDraft`); der
`collection`-Tab (`CollectionScreen`) zeigt die gespeicherten Drafts als Karten.
Ein Tippen öffnet die **Einzelkarten-Detailansicht** (`CardDetail`: große Karte,
Zurück, „Aus Sammlung entfernen" mit Bestätigung → `removeDraft`). Drafts überleben
Tab-Wechsel **und** App-Neustart, vollständig offline.

Die `collection/` ist in Schichten getrennt (von rein zu I/O):

- **`draft-collection.ts`** – reine, RN-/I/O-freie Logik: `upsertDraft` (idempotent
  per `id`), `removeDraftById`, `sortByNewest`, (De-)Serialisierung (tolerant gegen
  korrupte Dateien) und `draftScopeSegment(appId)` für die **Mandantentrennung**.
- **`draftStore.ts`** – `DraftStore` (CRUD) über einer injizierten
  `DraftPersistence`; `createInMemoryDraftStore` als Default/Test-Variante.
- **`expoDraftPersistence.ts`** – der **einzige** I/O-Berührungspunkt:
  `createExpoDraftPersistence(appId)` legt die Sammlung **`appId`-skopiert** unter
  `…/spotforge/<appId>/drafts.json` ab (`expo-file-system`), sodass zwei
  White-Label-Apps niemals dieselbe Sammlung sehen (ADR 0002/0012).
- **`useDraftCollection.ts`** – React-Anbindung (lädt beim Mount, Mutationen
  schreiben durch).

Der Host baut den persistenten Store und reicht ihn herein:

```ts
import { createDraftStore, createExpoDraftPersistence } from "@spotforge/app-shell";

<SpotForgeApp
  definition={definition}
  draftStore={createDraftStore(createExpoDraftPersistence(definition.id))}
  …
/>
```

Ohne `draftStore` nutzt `SpotForgeApp` einen In-Memory-Store (überlebt keinen
Neustart) – praktisch für Tests/Previews. Privacy-first: Fotos bleiben lokale
URIs und verlassen das Gerät nicht (ADR 0010). Der **Server-Sync** der Sammlung
(#19) und das **Online-Forgen** (#81) sind eigene, spätere Schritte.

## Sammlung, Deck-Management & Progression (GDD §7, #17)

Aufbauend auf der lokalen Sammlung erweitern drei reine Logik-Schichten +
zugehörige Screens den `collection`- und `profile`-Tab:

- **Kartenbibliothek** (`collection/library.ts`): Filter (`filterCards`) +
  Sortierung (`sortCards`) über der Sammlung, kombiniert in `queryLibrary`.
  Sortierungen: `newest`/`oldest`/`name`/`rarity` (alle deterministisch mit
  stabilem Tiebreak). Der `CollectionScreen` exponiert Freitextsuche + Sortier-
  Chips; die Filterlogik trägt zusätzlich Seltenheits-/Status-Filter für den
  Online-Forge-Pfad (#81).
- **Deck-Management** (`deck/deck.ts`, GDD §7.2): ein **Deck** ist eine geordnete
  Auswahl eigener Karten (per `id`) für Battles. Basis-Kapazität **50**
  (`DEFAULT_DECK_CAPACITY`); `deckCapacity(expansions)` ist der **Erweiterungs-
  Hook** (Level-Ups/IAP heben die Kapazität, ohne Logikänderung). Der
  `DeckScreen` (erreichbar aus der Sammlung) baut das Deck per Tippen; volle Decks
  lassen nur noch das Entfernen zu. `SpotForgeApp` hält den Deck-Zustand I/O-frei
  (`initialDeck`/`onDeckChange`/`deckExpansions`) und hält ihn über `pruneDeck`
  konsistent zur Sammlung (gelöschte Karten fallen automatisch aus dem Deck).
- **Profil & Progression** (`progression/profile.ts`, GDD §7.1): Level-Grenzen
  (`clampLevel`, 1–100), **Titel-System** (`titleForLevel`/`nextTitleBand`:
  Rookie → Pro → Expert → Master → Legendary) und aus der Sammlung abgeleitete
  **Statistiken** (`collectionStats`: gespottet/geschmiedet, Seltenheits-
  Verteilung, Seltenheits-Score). Der `ProfileScreen` ersetzt den bisherigen
  Platzhalter des `profile`-Tabs.

Das Level kommt weiterhin aus dem `PlayerProgress` (Progressive Disclosure);
Sieg-/Tauschstatistiken folgen mit dem Battle- bzw. Tausch-Feature. Die
**Upgrade-UI** (Duplikate → Stufen/Foil) wartet auf die game-core-Upgrade-Logik
(#7) und ist hier bewusst noch nicht enthalten.
