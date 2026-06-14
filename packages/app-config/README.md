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
| `theme`       | **Styling**-Tokens (Farben, Typografie), konsumiert von `@spotforge/ui` |
| `content`     | **Text-Overrides** (i18n), fällt auf gemeinsame Defaults zurück        |
| `assets`      | **Grafiken**: Icon, Splash, Logo, Kartenrahmen, Hintergründe           |

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

## Abhängigkeiten

`@spotforge/game-core` (für `CategoryId`).

## Status

Schema + `defineApp`-Helper definiert; Laufzeit-Validierung folgt.
