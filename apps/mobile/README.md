# @spotforge/mobile

**Generischer Expo-Host.** Dieses eine Projekt baut *jede* SpotForge-App – die
konkrete App wird zur Build-Zeit über `APP_VARIANT` ausgewählt. Der eigentliche
App-Code liegt in `@spotforge/app-shell`; hier wird er nur mit der aktiven
`AppDefinition` (aus `variants/<APP_VARIANT>/`) gemountet.

## So funktioniert es

- `app.config.ts` liest `APP_VARIANT`, lädt `variants/<variant>/app.definition`
  und übernimmt Name, Slug, Bundle-IDs, Icon/Splash daraus.
- `eas.json` hat pro App ein Build-Profil, das `APP_VARIANT` setzt.
- Die Shell bekommt dieselbe `AppDefinition` und konfiguriert Guardrails,
  KI-Prompts, Theme, Texte und Assets.

- Die `AppDefinition` wird in `app.config.ts` zusätzlich in `extra.appDefinition`
  hinterlegt; `App.tsx` liest sie von dort (Metro-sicher, kein dynamisches require)
  und reicht sie an `<SpotForgeApp/>`.

```bash
# Einmalig: gebündeltes ExecuTorch-Modell beziehen (liegt nicht im Git, #50)
pnpm fetch-models

# Auto-App lokal starten (Default-Variante)
APP_VARIANT=cars pnpm --filter @spotforge/mobile dev

# Auto-App bauen (EAS Cloud)
eas build --profile cars-production
```

> `App.tsx` bindet das Modell per statischem `require` ein – ohne vorheriges
> `pnpm fetch-models` schlägt der Metro-Bundle fehl.

## Build-Profile (eas.json)

Basis-Profile `production` / `preview` / `development`; pro Variante erbt
`<variant>-<env>` davon und setzt `APP_VARIANT` (z.B. `cars-production`,
`cars-preview`). Builds/Submit/OTA laufen über die `mobile-*`-Workflows – siehe
[`docs/deployment.md`](../../docs/deployment.md).

## Eine neue App ausliefern

1. `variants/<name>/` mit `app.definition.ts` + Assets anlegen.
2. Profile `<name>-production|preview|development` in `eas.json` ergänzen.
3. `mobile-build.yml` mit `variant=<name>` auslösen (oder lokal `eas build`).

Kein Eingriff in den App-Code.

## Development Build & PoC-Test-APK

Der PoC (#48–#51) bindet native Module ein (ExecuTorch, Kamera) und nutzt daher
einen **Development Build** (`expo-dev-client`); **Expo Go ist kein Ziel**.
JS-Iteration weiterhin via `pnpm dev`/Metro gegen den Dev-Build.

Zum schnellen Testen auf einem echten Gerät baut der Workflow
[`poc-android-apk.yml`](../../.github/workflows/poc-android-apk.yml) ohne
Expo-Cloud ein eigenständiges, **offline lauffähiges** APK (`expo prebuild` +
`gradlew assembleRelease`, Variante über den `variant`-Input, Default `cars`) und
legt es als herunterladbares Workflow-Artefakt ab. Trigger: **`workflow_dispatch`**
(auf jedem Branch auslösbar – Branch in der Actions-UI wählen oder per API mit
beliebigem `ref` starten) **und automatisch per `pull_request`** für jeden PR, der
einen den Build betreffenden Pfad ändert (Mobile-Host, gebündelte Pakete,
`variants/`, Modell-Beschaffung); `concurrency` bricht überholte Läufe je PR ab.

## Foto-Sanitisierung vor Upload (#89)

`upload/` enthält die nativen Bausteine, die ein Karten-Foto **vor jedem Upload**
on-device bereinigen (Goldene Regel 5):

- `skiaImageProcessor.ts` – **Skia**-Bildprozessor: lädt das Foto, skaliert auf
  `encode.maxEdge`, **redigiert** jede erkannte Region (`"blur"` weichzeichnen
  bzw. `"cover"` mit dem **App-Namen in Theme-Farben** überdecken) und enkodiert
  als JPEG neu – die Re-Enkodierung aus rohen Pixeln entfernt **alle EXIF/GPS**.
- `imageSize.ts` – liest Bildmaße via Skia (für die Box-Normalisierung der Detektoren).
- `createMobilePhotoSanitizer.ts` – setzt Detektoren (`createRegionDetector` aus
  `@spotforge/ai-engine`) + Prozessor über die generische
  `createUploadSanitizer`-Verdrahtung der app-shell zusammen. Die Blur-/Cover-Ziele
  kommen aus `definition.sanitization`; den `"cover"`-Text/-Farben liefert
  Identität + Branding der Variante.

Skias `postinstall` ist in `pnpm-workspace.yaml` (`allowBuilds`) auf `false` –
der native Code kommt aus den `react-native-skia-*`-Paketen und wird beim
`expo prebuild`/Gradle-Build autolinked.

> **Noch offen:** die zwei Detektor-`.pte` (YOLOv8n face / license-plate) sind
> noch nicht exportiert/gebündelt – Details + empfohlene Modelle in der
> `@spotforge/ai-engine`-README. Der eigentliche Upload-Endpunkt + Storage folgen
> mit #81/#19; bis dahin baut kein Screen den Sanitizer aktiv (die Bausteine sind bereit).

## Status

Gerüst – Expo (SDK 56) initialisiert: `App.tsx` mountet `@spotforge/app-shell`
mit der aktiven `AppDefinition` und reicht die zur Laufzeit/Build-Zeit aufgelösten
Bausteine herein: die aus dem gebündelten `.pte` gebaute **Kaskade** (Gate →
Feinmodell, EfficientNet via react-native-executorch) und das **Attribut-Schema**
der Kategorie (`data/categories/<id>.json`). Die Seltenheits-Rahmen werden in
`@spotforge/ui` prozedural gerendert (ADR 0015, kein Asset). Damit fährt die Shell
den Offline-Loop Spot → Draft → Bearbeiten. Echte Icon-/Splash-Assets der Variante
sind noch Platzhalter (`variants/cars/assets/`).

## Abhängigkeiten

`@spotforge/app-shell`, `@spotforge/app-config`, `@spotforge/ai-engine`.
