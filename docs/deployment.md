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

Coolify baut den gesamten Backend-Stack **direkt aus dem Git-Repo** über die
[`docker-compose.yml`](../docker-compose.yml) (App + Postgres + Redis + MeiliSearch +
Garage). Der **Ingress läuft ausschließlich über Coolifys Traefik-Proxy** – die
Compose-Datei hat daher **keine Host-Port-Mappings**. Nach außen wird nur der
**App-Container** über eine Domain exponiert; Postgres, Redis, MeiliSearch und
Garage bleiben intern und sind nur über das Compose-Netz (per Service-Name)
erreichbar.

### Einmalige Einrichtung

1. **Resource → Docker Compose** anlegen, das Repo `justb81/spotforge` per
   **GitHub-App** verbinden (Branch `main`), **Compose-Pfad** `docker-compose.yml`.
2. **Domain** dem `backend`-Service zuweisen. Coolify füllt `SERVICE_FQDN_BACKEND_3000`
   und generiert daraus automatisch die Traefik-Labels (interner Port `3000`).
   **Health-Check-Pfad:** `/health`.
3. **Environment-Variablen** des Stacks setzen – Schlüssel siehe
   [`.env.example`](../.env.example). Insbesondere die Secrets ohne Default
   (`POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `JWT_SECRET`, `MEILI_MASTER_KEY`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) sowie `GOOGLE_CLIENT_IDS` /
   `APPLE_CLIENT_IDS`. Die Verbindungs-URLs zeigen intern auf `postgres` / `redis` /
   `garage` (in der Compose-Datei vorgegeben).
4. **Zwei Postgres-Rollen (ADR 0012):** Die App verbindet als **Nicht-Superuser**
   (`DATABASE_URL`, Rolle `spotforge_app`) – nur so erzwingt RLS die Mandantentrennung.
   **Migrate-on-boot** nutzt die Admin-Rolle (`MIGRATION_DATABASE_URL`) und legt die
   App-Rolle beim Start idempotent an. Migrationen laufen automatisch beim Boot
   (Advisory-Lock); kein separater Migrations-Schritt nötig.
5. **Garage-Bootstrap** (einmalig, sobald der S3-Speicher genutzt wird): Layout/Key/
   Bucket via `tools/garage/bootstrap.sh` anlegen; den erzeugten Key als
   `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` setzen. Garage bleibt intern, bis das
   Bild-Upload-Feature es über eine eigene Subdomain exponiert (ADR 0013).
6. **Auto-Deploy** aktivieren (Deploy bei Push auf `main`). Optional „nur nach grünem
   CI": in Coolify das Warten auf den GitHub-Check aktivieren.

### Deploy & Rollback

- **Deploy:** Push auf `main` → Coolify baut und rollt aus. Manuell: „Redeploy" in Coolify.
- **Rollback:** in der Deployment-Historie ein früheres Deployment auswählen → „Redeploy".

### Lokal entwickeln

Lokal läuft das Backend **nativ auf dem Host** (Hot-Reload); nur die Infra kommt aus
Docker – über die separate [`docker-compose.dev.yml`](../docker-compose.dev.yml), die
**mit** Host-Ports exponiert (anders als der Coolify-Stack):

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # Postgres, Redis, MeiliSearch, Garage
tools/garage/bootstrap.sh                         # einmalig: Garage-Key/Bucket
pnpm --filter @spotforge/backend dev              # Fastify mit Hot-Reload (tsx watch)
# Produktions-Image wie Coolify bauen/prüfen:
docker compose up --build
```

Health-Checks: `GET /health` (Liveness), `GET /ready` (Readiness – pingt DB + Redis).
Fachliche Routen erwarten den Mandanten-Header `x-app-id` (= `AppDefinition.id`).

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

1. `variants/<name>/` mit `app.definition.ts` + `branding.config.ts` (Theme/Assets,
   nur Abweichungen von `variants/_default`, ADR 0011) + `assets/` anlegen.
2. In `eas.json` die drei Profile `<name>-production|preview|development` ergänzen
   (analog zu `cars-*`), jeweils mit `env.APP_VARIANT=<name>`.
3. `eas init` für die neue Variante (eigene EAS-Projekt-ID).
4. Builds: `mobile-build.yml` mit `variant=<name>` auslösen.

Das Backend ist mandantenfähig – eine neue App benötigt **keine** Backend-Änderung,
nur eine neue `appId` (= `AppDefinition.id`) im `x-app-id`-Header.
