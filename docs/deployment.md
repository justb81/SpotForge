# Deployment & CI/CD

Diese Anleitung beschreibt, wie SpotForge gebaut, getestet und ausgeliefert wird:
**CI** über GitHub Actions, das **Backend** self-hosted auf **Coolify** (Build
direkt aus dem Git-Repo) und die **Mobile-Apps** über **EAS** (Expo).

> Architektur-Entscheidung dazu: [ADR 0003](./adr/0003-ci-cd-und-deployment.md).

---

## Überblick

```
                 ┌─────────────────── GitHub Actions ───────────────────┐
  git push ─────▶│ ci.yml: format · lint · typecheck · test · build       │
                 │ mobile-build.yml: eas build (+ submit)   [manuell/Tag] │
                 │ mobile-update.yml: eas update (OTA)      [push main]   │
                 └────────────────────────────────────────────────────────┘
       │
       ├── Backend ─▶ Coolify zieht das Repo, baut apps/backend/Dockerfile, deployt
       └── Mobile  ─▶ EAS Cloud baut/submittet die App, EAS Update liefert OTA
```

Es gibt **keinen** Backend-Deploy-Workflow in GitHub Actions – das Deployment macht
Coolify selbst. GitHub Actions ist reines Build-/Test-Gate (Backend) bzw. Build- und
Update-Pipeline (Mobile).

---

## Benötigte Secrets

| Secret / Credential        | Wo                | Wofür                                            |
| -------------------------- | ----------------- | ------------------------------------------------ |
| _(keine)_                  | Coolify           | Backend-Deploy läuft über die Coolify-GitHub-App |
| `EXPO_TOKEN`               | GitHub Actions    | EAS Build/Submit/Update (`mobile-*`-Workflows)   |
| Apple-/Google-Credentials  | EAS / `eas.json`  | nur für `eas submit` (Store-Upload)              |

Das Backend braucht **keine** GitHub-Secrets. Seine Laufzeit-Konfiguration (DB-/Redis-
URLs usw.) liegt als Environment-Variablen in Coolify (Vorlage: [`.env.example`](../.env.example)).

---

## Backend auf Coolify

Coolify baut das Backend **direkt aus dem Git-Repo** (kein externer Registry-Schritt).

### Einmalige Einrichtung

1. **Resource → Application** anlegen und das Repo `justb81/spotforge` per **GitHub-App**
   verbinden (Branch `main`).
2. **Build-Einstellungen** (Monorepo!):
   - **Base Directory:** `/` (Repo-Wurzel ist der Docker-Build-Context)
   - **Dockerfile Location:** `apps/backend/Dockerfile`
   - Build Pack: **Dockerfile**
3. **Port:** `3000`. **Health-Check-Pfad:** `/health`.
4. **Environment-Variablen** der App setzen – Schlüssel siehe [`.env.example`](../.env.example).
   Die Verbindungs-URLs zeigen auf die folgenden Coolify-Ressourcen.
5. **Daten-Ressourcen** in Coolify anlegen und mit der App verbinden:
   - **PostgreSQL** → `DATABASE_URL`
   - **Redis** → `REDIS_URL`
   - **MeiliSearch** → `MEILI_HOST` / `MEILI_MASTER_KEY`
   - **S3/MinIO** → `S3_*`
6. **Auto-Deploy** aktivieren (Deploy bei Push auf `main`). Optional: „nur nach grünem
   CI" – dazu in Coolify das Warten auf den GitHub-Check aktivieren.

### Deploy & Rollback

- **Deploy:** Push auf `main` → Coolify baut und rollt aus. Manuell: „Redeploy" in Coolify.
- **Rollback:** in der Deployment-Historie ein früheres Deployment auswählen → „Redeploy".

### Lokal entwickeln

```bash
cp .env.example .env
docker compose up -d                  # Postgres, Redis, MeiliSearch, MinIO
pnpm --filter @spotforge/backend dev  # Fastify mit Hot-Reload (tsx watch)
# Image wie Coolify bauen/prüfen:
docker compose --profile backend up --build
```

Health-Checks: `GET /health` (Liveness), `GET /ready` (Readiness). Fachliche Routen
erwarten den Mandanten-Header `x-app-id` (= `AppDefinition.id`).

---

## Mobile-Apps über EAS

Builds laufen in der **Expo Cloud** (EAS). Profile stehen in
[`apps/mobile/eas.json`](../apps/mobile/eas.json): Basis-Profile `production` /
`preview` / `development`, davon erben pro Variante `<variant>-<env>` (z.B.
`cars-production`) und setzen `APP_VARIANT`.

### Einmalige Einrichtung

1. Expo-Konto anlegen, **Access-Token** erzeugen, als GitHub-Secret `EXPO_TOKEN` hinterlegen.
2. Pro Variante einmalig `eas init` ausführen (legt die EAS-Projekt-ID an); diese landet
   in der Expo-Projektkonfiguration der Variante.
3. Für Store-Submit die Credentials hinterlegen (Apple App Store Connect / Google Play
   Service-Account) und die Platzhalter im `submit`-Block der `eas.json` ersetzen.
4. **Echte Assets** für die Variante ergänzen (`variants/cars/assets/icon.png`,
   `splash.png`, …) – aktuell liegen dort Platzhalter.

### Pipelines

- **`mobile-build.yml`** (manuell / `mobile-v*`-Tag): `eas build` für eine Variante,
  optional `eas submit`. Inputs: `variant`, `platform` (`all|ios|android`), `profile`
  (`production|preview|development`), `submit`.
- **`mobile-update.yml`** (Push auf `main`, JS-/Asset-Pfade): `eas update` (OTA) auf den
  Channel `production`. Für Fakten-/Content-Updates ohne Store-Release.
  **Optional und standardmäßig inaktiv:** Das Paket `expo-updates` ist bewusst nicht
  installiert – die App aktualisiert sich damit **ausschließlich über die Stores**
  (App Store / Google Play). OTA greift erst nach bewusstem `expo-updates`-Setup
  (EAS Update ist nur bis ~1000 MAU kostenfrei; Build und Update werden getrennt
  abgerechnet). Alternativ self-hosted via eigenem Update-Server. Native Änderungen
  erfordern ohnehin immer einen vollständigen Build.

Lokal starten:

```bash
APP_VARIANT=cars pnpm --filter @spotforge/mobile dev
```

---

## Eine neue App in die Pipelines aufnehmen

Gemäß White-Label-Prinzip (kein Code):

1. `variants/<name>/` mit `app.definition.ts` + `assets/` anlegen.
2. In `eas.json` die drei Profile `<name>-production|preview|development` ergänzen
   (analog zu `cars-*`), jeweils mit `env.APP_VARIANT=<name>`.
3. `eas init` für die neue Variante (eigene EAS-Projekt-ID).
4. Builds: `mobile-build.yml` mit `variant=<name>` auslösen.

Das Backend ist mandantenfähig – eine neue App benötigt **keine** Backend-Änderung,
nur eine neue `appId` (= `AppDefinition.id`) im `x-app-id`-Header.
