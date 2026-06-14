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
# Einmalig: gebündeltes ONNX-Modell beziehen (liegt nicht im Git, #50)
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

Der PoC (#48–#51) bindet native Module ein (ONNX, Kamera) und nutzt daher einen
**Development Build** (`expo-dev-client`); **Expo Go ist kein Ziel**. JS-Iteration
weiterhin via `pnpm dev`/Metro gegen den Dev-Build.

Zum schnellen Testen auf einem echten Gerät baut der Workflow
[`poc-android-apk.yml`](../../.github/workflows/poc-android-apk.yml) ohne
Expo-Cloud ein eigenständiges, **offline lauffähiges** APK (`expo prebuild` +
`gradlew assembleRelease`, Profil `cars-preview`) und legt es als
herunterladbares Workflow-Artefakt ab. Manuell auslösbar oder bei jedem Push auf
einen `claude/poc-**`-Branch.

## Status

Gerüst – Expo (SDK 56) initialisiert: `App.tsx` mountet `@spotforge/app-shell`
mit der aktiven `AppDefinition`. **PoC-Loop komplett (#48–#51):** Dev-Build +
Test-APK-Pipeline, Kamera-Capture, gebündeltes MobileNet-Modell (via `expo-asset`)
und der injizierte On-Device-Klassifikator stehen. Echte Icon-/Splash-Assets der
Variante sind noch Platzhalter (`variants/cars/assets/`).

## Abhängigkeiten

`@spotforge/app-shell`, `@spotforge/app-config`.
