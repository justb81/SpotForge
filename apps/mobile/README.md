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
- `mlkitFaceDetector.ts` – **MLKit**-Gesichtsdetektor (`@infinitered/react-native-mlkit-face-detection`,
  ein **Expo-Modul** → New-Arch-tauglich): Foto-URI → normalisierte Gesichts-Regionen.
  Permissiv, on-device, **kein gebündeltes Modell**.
- `mlkitTextDetector.ts` – **MLKit**-Textdetektor (`@infinitered/react-native-mlkit-text-recognition`,
  ebenfalls ein Expo-Modul): OCR → jede lesbare **Textzeile** als Region. Deckt
  **Kennzeichen** kategorie-neutral mit ab (MLKit erkennt Text, nicht „Kennzeichen").
- `imageSize.ts` – liest Bildmaße via Skia (für die Box-Normalisierung der Detektoren).
- `createMobilePhotoSanitizer.ts` – baut für die laut `definition.sanitization`
  aktiven Ziele die MLKit-Detektoren + den Skia-Prozessor und verdrahtet sie über
  `createUploadSanitizer` (app-shell). `"cover"`-Text/-Farben aus Identität + Branding.

Der Spot-Screen zeigt nach jedem akzeptierten Schuss eine **Diagnosezeile**
(`formatSanitizationReport`): redigierte Gesichter und Kennzeichen/Text-Regionen,
Ausgabemaße/-größe und „EXIF entfernt" – damit ist die (sonst unsichtbare)
Bereinigung direkt am Gerät prüfbar.

Skias `postinstall` ist in `pnpm-workspace.yaml` (`allowBuilds`) auf `true` (kopiert
die vorgebauten nativen Skia-Libs nach `libs/`); die MLKit-Module sind Expo-Module
und werden beim `expo prebuild`/Gradle-Build autolinked (kein Config-Plugin nötig;
`expo-image` ist als Plugin registriert). Die Text-Recognition 5.0.1 pinnt transitiv
`@infinitered/react-native-mlkit-core@3.1.0`; eine pnpm-`overrides`-Regel
vereinheitlicht das auf `5.0.0` (eine einzige native Core-Instanz, API stabil).

> **Detektoren (permissiv, kein AGPL):** Gesichter über MLKit Face Detection,
> Kennzeichen/Text über MLKit Text Recognition (OCR → alle lesbaren Text-Regionen) –
> beide on-device, ohne gebündeltes Modell. Hintergrund zur Lizenz-/Detektor-
> Entscheidung: Issue #123. Der Upload-Endpunkt + Storage folgen mit #81/#19; bis
> dahin redigiert der Sanitizer das Draft-Foto on-device, ohne Upload.

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
