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

```bash
# Auto-App lokal starten (Default-Variante)
APP_VARIANT=cars pnpm dev

# Auto-App bauen
eas build --profile cars
```

## Eine neue App ausliefern

1. `variants/<name>/` mit `app.definition.ts` + Assets anlegen.
2. Build-Profil in `eas.json` ergänzen (`"env": { "APP_VARIANT": "<name>" }`).
3. `eas build --profile <name>`.

Kein Eingriff in den App-Code.

## Status

Gerüst – Expo-Projekt noch nicht initialisiert (`app.config.ts`/`eas.json`
liegen als Vorlage vor). Start: Expo in dieses Verzeichnis initialisieren und
`@spotforge/app-shell` als Entry mounten.

## Abhängigkeiten

`@spotforge/app-shell`, `@spotforge/app-config`.
