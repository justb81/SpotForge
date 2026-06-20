# @spotforge/app-config

**Das Herz der White-Label-Architektur.** Definiert die `AppDefinition` – das
typisierte Konfigurationsschema, aus dem jede einzelne App entsteht. Eine neue
App zu erzeugen heißt: eine neue `AppDefinition` unter `variants/<name>/`
anlegen – **kein neuer Code**.

## Was eine App konfigurierbar macht

Eine `AppDefinition` bündelt genau die per-App variablen Dinge:

| Feld          | Zweck                                                                 |
|---------------|-----------------------------------------------------------------------|
| `id`          | Stabiler Identifier – zugleich der **Mandanten-Key (`appId`)** am Server |
| `identity`    | Store-Identität: Name, Slug, Scheme, iOS-Bundle, Android-Package       |
| `category`    | Welche `game-core`-Kategorie die App schmiedet + **Guardrails**        |
| `ai`          | **KI-Prompts** für Klassifikation, Card-Art, Fakten-Extraktion         |
| `content`     | **Mehrsprachige Text-Overrides** (i18n), fällt auf gemeinsame Defaults zurück |
| `features`    | **Optionale Feature-Schalter** (Default: aus), siehe unten             |

Theme & Assets sind **nicht** Teil der `AppDefinition`, sondern leben als
**Branding** in einer eigenen Config je Variante (`branding.config.ts`, ADR 0011).

## Features

`features` sind optionale, per-Variante schaltbare Funktionen. Jeder Schalter ist
optional und standardmäßig **aus** – `resolveFeatures(definition)` löst auf die
konkreten Werte (inkl. Defaults) auf. Aktuell:

| Schalter      | Wirkung                                                               |
|---------------|-----------------------------------------------------------------------|
| `imageImport` | Zeigt neben der Kamera einen Button, der ein **bestehendes Bild aus der Galerie** durch dieselbe Spot-Kette (Gate → Feinmodell) schickt. Test-/QA-Komfort; kein Upload (rein on-device). |
| `autoSpot`    | Schaltet den **Auto-Spot**-Modus frei (#85): ein intervallgesteuerter Auslöser, der den normalen Foto→Draft-Flow getaktet wiederholt („Point & Forge"). Opt-in; der manuelle Tap bleibt Default (ADR 0010). Parameter unter `category.gate.auto`. |

```ts
features: {
  imageImport: true,
  autoSpot: true,
},
```

### Auto-Spot-Parameter (`category.gate.auto`)

Bei aktivem `features.autoSpot` liefert `category.gate.auto` die getakteten
Parameter; `resolveAutoSpot(definition)` löst sie gegen `DEFAULT_AUTO_SPOT`
(2000 ms / 0.6) auf. Die **`autoFireMinConfidence`** ist bewusst **strenger** als
die manuelle `guardrails.minConfidence`: beim Schwenken über viele Szenen soll
nichts auf ein flüchtiges auto-ähnliches Etwas fehlauslösen. Das Intervall ist per
User-Setting überschreibbar (`clampAutoSpotInterval` klemmt auf 1000…10000 ms).

```ts
category: {
  gate: {
    allow: ["sports car", "convertible" /* … */],
    auto: { intervalMs: 2000, autoFireMinConfidence: 0.6 },
  },
},
```

## Mehrsprachigkeit

Alle benutzersichtbaren Texte einer Variante sind **mehrsprachig**: Statt eines
nackten Strings tragen sie einen `LocalizedText` – eine Map vom Sprachcode
(ISO 639-1, Typ `LocaleCode`) auf die Übersetzung. Aktuell unterstützt:
`de` (Deutsch) und `en` (Englisch). Das `Record<LocaleCode, string>` erzwingt,
dass **jede** Sprache vorhanden ist; fehlt eine, schlägt die Typprüfung fehl.

Betroffen sind die `content`-Overrides und `category.guardrails.rejectMessage`:

```ts
content: {
  "spot.cta": { de: "Auto spotten", en: "Spot a car" },
},
category: {
  guardrails: {
    // ...
    rejectMessage: {
      de: "Das sieht nicht nach einem Fahrzeug aus. …",
      en: "That doesn't look like a vehicle. …",
    },
  },
},
```

Die `ai`-Prompts bleiben einzelne Strings – sie sind Modell-Instruktionen, keine
Anzeigetexte.

## Guardrails

Die `category.guardrails` legen fest, was die On-Device-KI akzeptiert. Erkennt
der Klassifikator ein Objekt außerhalb von `allowed` (oder unter `minConfidence`),
zeigt die App `rejectMessage` statt eine Karte zu schmieden. So bleibt die
Auto-App auf Fahrzeuge fokussiert, ohne dass Code geändert wird.

## Nutzung

```ts
// variants/cars/app.definition.ts
import { defineApp } from "@spotforge/app-config";

export default defineApp({ id: "cars", /* ... */ });
```

Die App (`apps/mobile`) lädt die aktive Variante zur Build-Zeit über
`APP_VARIANT`. Validierung stellt sicher, dass eine Variante vollständig ist,
bevor gebaut wird.

## Validierung & Loader

`validateAppDefinition(input, options?)` prüft eine Definition gegen ein
zod-Schema: Pflichtfelder, gültige `CategoryId`s, `minConfidence` ∈ [0, 1],
Guardrail-Konsistenz (primäre Kategorie ∈ `allowed`) und – mit injizierter
Existenzprüfung – das Vorhandensein der Asset-Dateien. Es sammelt **alle**
Probleme als `{ path, message }`. `assertAppDefinition(...)` wirft daraus einen
`AppDefinitionError` mit klarer Mehrzeilen-Meldung.

```ts
import { validateAppDefinition, assertAppDefinition } from "@spotforge/app-config";

const result = validateAppDefinition(input);
if (!result.valid) console.error(result.issues);
```

Der **Loader** löst `APP_VARIANT` → `variants/<name>/app.definition` auf, lädt
und validiert die Variante (inkl. Asset-Existenz). Er nutzt `node:`-APIs und ist
daher **nicht** vom RN-tauglichen Paket-Einstieg re-exportiert, sondern liegt
unter dem Subpfad `@spotforge/app-config/loader` (nur Build-Zeit/Node):

```ts
import { loadVariant } from "@spotforge/app-config/loader";

const { definition } = await loadVariant(process.env.APP_VARIANT ?? "cars");
```

`pnpm validate-variants` validiert alle Varianten auf der Platte und bricht den
CI-Build mit klarer Meldung ab, wenn eine unvollständig/ungültig ist.

## Abhängigkeiten

`@spotforge/game-core` (für `CategoryId`/`CATEGORY_IDS`), `zod` (Schema). Der
Loader zusätzlich Node-Built-ins (`node:fs`/`node:path`/`node:url`).

## Status

Schema, `defineApp`-Helper, Laufzeit-Validierung und Build-Zeit-Loader
implementiert; Tests gegen `variants/cars`.
