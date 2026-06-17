# ADR 0003 – CI/CD und Deployment

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0001 (Monorepo/Expo), ADR 0002 (White-Label, mandantenfähiger Server)

## Kontext

Das Gerüst braucht eine reproduzierbare Pipeline: Qualitäts-Gates (Lint/Typecheck/
Test/Build) für das Monorepo, einen Weg, das **Backend** auszuliefern, und einen Weg,
die **Mobile-Apps** (Expo White-Label) zu bauen und zu aktualisieren. Vorgabe:
**kein externes Backend-Hosting** – es existiert bereits ein **Coolify-Server**.

## Entscheidung

1. **CI über GitHub Actions.** `ci.yml` läuft auf Push/PR und führt
   `format:check → lint → typecheck → test → build` über Turborepo aus
   (pnpm- und Turbo-Cache). Dient zugleich als Gate vor dem Backend-Deploy.
2. **Backend self-hosted auf Coolify, Build aus dem Git-Repo.** Coolify ist per
   GitHub-App mit dem Repo verbunden und baut `apps/backend/Dockerfile` (Build-Context =
   Repo-Wurzel) bei Push auf `main`. **Kein** GHCR/Registry-Schritt und **kein**
   Deploy-Workflow in GitHub Actions.
3. **Backend-Build = einzelnes ESM-Bundle (tsup).** Workspace-Pakete (`@spotforge/*`)
   werden eingebündelt (source-first), externe Abhängigkeiten via `pnpm deploy --prod`
   in ein schlankes Runtime-Image. Container ist non-root mit Healthcheck auf `/health`.
4. **Mobile über EAS (Expo Cloud).** `mobile-build.yml` (`eas build`/`eas submit`) und
   `mobile-update.yml` (`eas update`, OTA). Profile pro Variante in `eas.json`
   (`<variant>-<env>`), Auswahl der App weiterhin über `APP_VARIANT`.
5. **Geteilte Tooling-Configs in `@spotforge/config`** (ESLint Flat Config, Prettier,
   tsconfig-Presets), damit alle Pakete dieselben Regeln nutzen.

## Begründung

- Coolify nutzt vorhandene Infrastruktur, hält Daten in eigener Hand (Privacy-first, GDD
  §10.4) und vermeidet Vendor-Lock-in eines externen PaaS.
- Build aus dem Repo spart den Registry-Umweg; das Dockerfile bleibt portabel und lokal
  identisch baubar (`docker compose up --build` über die Coolify-`docker-compose.yml`).
- EAS ist das etablierte Expo-Muster; iOS-Builds erfordern ohnehin Apple-Toolchain, die
  EAS in der Cloud bereitstellt.
- tsc bleibt reines Typecheck-Werkzeug; das Bündeln übernimmt tsup – das löst das
  Source-first-Problem (Pakete zeigen mit `main`/`types` auf `src`) zur Laufzeit.

## Konsequenzen

- Es muss eine `pnpm-lock.yaml` gepflegt werden (`--frozen-lockfile` in CI und Image).
- Secrets: nur `EXPO_TOKEN` (+ Store-Credentials) in GitHub; das Backend-Deploy braucht
  keine GitHub-Secrets (Konfiguration liegt in Coolify).
- Coolify-Einrichtung ist manuell/dokumentiert (Base-Directory `/`, Dockerfile-Pfad,
  Daten-Ressourcen) – siehe [`docs/deployment.md`](../deployment.md).
- Jede neue App ergänzt nur `eas.json`-Profile und `variants/<name>/`; Backend/CI bleiben
  unverändert (White-Label).
- Verworfene Alternativen: externes PaaS (Fly.io/Render – widerspricht Self-Hosting);
  Image über GHCR + Coolify-Webhook (zusätzlicher Registry-Schritt ohne Mehrwert hier);
  self-hosted Mobile-Builds (iOS ohne Apple-Hardware unpraktikabel).
