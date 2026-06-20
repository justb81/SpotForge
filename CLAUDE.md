# CLAUDE.md

Leitfaden für Claude/Agenten, die an **SpotForge** arbeiten. Diese Datei fasst
das Projekt, die Architektur-Entscheidungen, Konventionen und die
Rahmenbedingungen der Arbeitsumgebung zusammen. Bei Konflikten gilt das
[Game Design Document](./docs/Game-Design.md) für *Spielinhalt* und die
[ADRs](./docs/adr/) für *Architektur*.

---

## Was ist SpotForge?

Ein Mobile-Game nach dem Loop **Spot → Forge → Collect → Battle/Trade**: Objekte
der echten Welt fotografieren, eine **lokale KI** erkennt sie und „schmiedet"
eine Sammelkarte mit realen Fakten als Stats; Karten werden gesammelt, getauscht
und in **Trumpf-Duellen** (Top-Trumps) eingesetzt.

**Produktmodell (wichtig):** SpotForge ist **White-Label**. Jede Kategorie ist
eine **eigene App** (Auto-App, Tier-App, …), erzeugt aus *einer* gemeinsamen
Codebase und unterschieden **nur durch Konfiguration**. Ein **zentraler,
mandantenfähiger Server** bedient alle Apps.

> **Aktueller Fokus:** Wir starten **ausschließlich mit der Auto-App (CarForge)**,
> halten aber alles generisch. Niemals kategorie-spezifische Annahmen fest in den
> gemeinsamen Code kodieren.

---

## Goldene Regeln

1. **Neue App = neue Konfiguration, kein Code.** Eine App ist eine
   `AppDefinition` unter `variants/<name>/`. Wenn du Code in `app-shell`/`ui`/
   `ai-engine` änderst, um eine bestimmte Kategorie zu unterstützen, machst du es
   wahrscheinlich falsch – es gehört in die `AppDefinition`.
2. **`game-core` ist rein.** Keine I/O, kein React Native, kein Fastify, kein
   Zufall ohne injizierten Seed. Es ist die **einzige Wahrheit** der Spielregeln –
   genutzt von App (offline) **und** Backend (autoritative PvP-Validierung).
3. **`app-shell` ist generisch.** Keine fest kodierten Texte, Farben, Bundle-IDs
   oder Kategorien – alles kommt aus der `AppDefinition`.
4. **Mandantentrennung am Server.** Jede Anfrage trägt eine `appId`
   (= `AppDefinition.id`); alle Daten sind `appId`-skopiert. App-übergreifende
   Features sind bewusst „später zuschaltbar", nicht jetzt.
5. **Privacy-first.** KI-Inferenz on-device; Fotos verlassen das Gerät nur per
   Opt-in; Standort nur grob (PLZ/Region).
6. **Vor 1.0: keine Abwärtskompatibilität, keine Altlasten.** Solange wir nicht
   bei **Version 1.0** sind, wird **keinerlei** Abwärtskompatibilität, kein
   Legacy-Pfad und keine veraltete Information aufbewahrt. Beim Ändern von Code,
   Doku, Issues oder Konfiguration **ersetzt** du Überholtes vollständig, statt
   es „für später" daneben stehen zu lassen. Keine deprecated-Schichten, keine
   „erst X, dann Y"-Migrationsbrücken, keine veralteten Hinweise/Workflows in
   READMEs oder Kommentaren. Wenn etwas nicht mehr der eingeschlagene Weg ist,
   **entfernen**, nicht behalten. (Beispiel: Expo Go ist kein Ziel → es darf
   nirgends mehr referenziert werden.)

---

## Architektur & Verzeichnisse

TypeScript-Monorepo (pnpm Workspaces + Turborepo).

```
apps/
  mobile/      generischer Expo-Host – baut JEDE App via APP_VARIANT
  backend/     zentraler, mandantenfähiger Fastify-Server (appId-skopiert)
packages/
  app-config/  AppDefinition (Guardrails, Prompts, Texte) + Branding (Theme/Assets) + Loader – HERZSTÜCK
  app-shell/   die komplette generische App (Screens/Flows), kategorie-neutral
  game-core/   reine Spiel- & Kartendomäne (Card, Rarity, Trumpf-Engine)
  ai-engine/   On-Device-Pipeline (generisch; nimmt Guardrails/Prompts)
  api-contract/ geteilte Request-/Response-Schemata (zod) – Backend ↔ Client
  api-client/  typisierter Backend-Client
  ui/          themebares Design-System & Kartenrendering
  config/      geteilte tsconfig / eslint / prettier
variants/
  _default/    generische Branding-Basis (Theme + Kartenrahmen); keine eigene App
  cars/        CarForge – erste & einzige App (app.definition.ts + branding.config.ts + assets/)
data/
  categories/  Kategorien-/Attributschema (Source of Truth; vehicles.json = Referenz)
  facts/       Seeds für die Offline-Fakten-DB (SQLite + FTS5; .db nicht im Git)
  models/      ML-Modell-Artefakte (fest gebündelt je Variante; nicht im Git)
docs/          Game-Design.md, architecture.md, repo-structure.md, adr/
tools/         Build-/Codegen-/Seed-Skripte
```

Vertiefung: [`docs/repo-structure.md`](./docs/repo-structure.md) ·
[`docs/architecture.md`](./docs/architecture.md).

### Abhängigkeitsrichtung (keine Zyklen)
```
variants/<name> ─▶ app-config
apps/mobile ─────▶ app-shell, app-config  + variants/<APP_VARIANT> (Build-Zeit)
apps/backend ────▶ game-core, api-contract
app-shell ───────▶ ui, api-client, ai-engine, game-core, app-config
ai-engine ───────▶ game-core, app-config, data/categories
ui ──────────────▶ game-core, app-config
api-client ──────▶ game-core, api-contract
api-contract ────▶ (nichts – nur zod)
app-config ──────▶ game-core
game-core ───────▶ (nichts – Wurzel)
```
`variants/` sind **keine** Workspace-Pakete, sondern reine Config-Bündel, die
`apps/mobile` per `APP_VARIANT` auflöst.

---

## Tech-Stack

| Bereich        | Wahl                                                          |
|----------------|---------------------------------------------------------------|
| Sprache        | TypeScript (end-to-end)                                       |
| Mobile         | React Native + Expo (White-Label via `APP_VARIANT`)           |
| Backend        | Node.js + Fastify (multi-tenant), PostgreSQL, Redis, Socket.io|
| On-Device-KI   | ExecuTorch (react-native-executorch) – PyTorch `.pte`        |
| Offline-Daten  | SQLite + FTS5                                                 |
| Monorepo       | pnpm Workspaces + Turborepo                                   |

---

## Eine neue App hinzufügen

1. `variants/<name>/app.definition.ts` mit `defineApp({ … })` aus
   `@spotforge/app-config` anlegen (Identität, Kategorie + Guardrails,
   KI-Prompts, Text-Overrides).
2. `variants/<name>/branding.config.ts` mit `defineBranding({ … })` anlegen –
   **nur Abweichungen** von `variants/_default` (Theme + marken-spezifische Assets;
   Kartenrahmen werden geerbt). Assets nach `variants/<name>/assets/` (ADR 0011).
3. Build-Profil in `apps/mobile/eas.json` ergänzen (`"env": { "APP_VARIANT": "<name>" }`).
4. `APP_VARIANT=<name> pnpm dev` bzw. `eas build --profile <name>`.

Kein Eingriff in den App-Code. Kategorie-Schema ggf. unter `data/categories/`
ergänzen.

---

## Entscheidungen (ADRs)

- **[ADR 0001](./docs/adr/0001-monorepo-and-react-native.md):** Monorepo +
  React Native/Expo + TypeScript end-to-end.
- **[ADR 0002](./docs/adr/0002-multi-app-single-codebase.md):** White-Label –
  viele Apps aus einer Codebase via Build-Varianten; ein mandantenfähiger Server.
- **[ADR 0003](./docs/adr/0003-ci-cd-und-deployment.md):** CI/CD über GitHub
  Actions; Backend self-hosted auf Coolify (Build aus dem Repo); Mobile via EAS.
- **[ADR 0004](./docs/adr/0004-distributionsstrategie-apps-vs-lobby.md):**
  Distributionsstrategie (separate Apps vs. Lobby) – **offen**, Entscheidung bei
  Vertikale #2; aktuelle Tendenz zu einer App wegen des Netzwerk-Effekts.
- **[ADR 0005](./docs/adr/0005-node-24-lts-baseline.md):** Node **24 LTS** als
  fixierte Laufzeit-Baseline (gerade = LTS; Current-Linien 25/odd nicht für
  Produktion). Neubewertung bei Node 26 LTS (~Okt 2026).
- **[ADR 0006](./docs/adr/0006-supply-chain-hardening.md):** Supply-Chain-Härtung –
  pnpm 11, **7-Tage-Mindestalter** (`minimumReleaseAge`) + Dependabot-`cooldown`,
  blockierte Build-Skripte (`allowBuilds`); Expo/RN-Baseline ausgenommen.
- **[ADR 0007](./docs/adr/0007-on-device-inference-executorch.md):** On-Device-
  Inferenz über **ExecuTorch** (`react-native-executorch`) statt ONNX Runtime
  Mobile – ONNX-RN unterstützt die von Expo SDK 56 erzwungene New Architecture
  (Bridgeless) nicht. Modelle als gebündelte `.pte`.
- **[ADR 0008](./docs/adr/0008-modell-export-pipeline-und-lifecycle.md):** Modell-
  Export & Versionierung – Modelle **fest je Variante ins APK gebündelt** (kein
  Nachladen/OTA); reproduzierbarer Export + Manifest.
- **[ADR 0009](./docs/adr/0009-standortbasierte-spotting-haeufigkeit.md):**
  Seltenheit = `realWorldRarity × (1 − lokale Spotting-Dichte)`; „Standort-Bonus"
  entfällt, Dichte über adaptives Raster; Zähler server-autoritativ.
- **[ADR 0010](./docs/adr/0010-online-schmiede-und-draft-lebenszyklus.md):**
  **Spot offline → Forge online.** Spotten erzeugt on-device einen **Draft**; das
  **Forgen** ist server-autoritativ (World Data + Seltenheit + Freigabe neuer
  Karten), Lebenszyklus `draft → forged`.
- **[ADR 0011](./docs/adr/0011-branding-config-und-basis-variante.md):** Theme &
  Assets als **Branding-Config** aus der `AppDefinition` herausgelöst;
  `variants/_default` als generische Basis, per Deep-Merge von Varianten
  überschrieben (`resolveBranding`).
- **[ADR 0012](./docs/adr/0012-backend-datenbank-wahl.md):** Backend-DB =
  **PostgreSQL (self-hosted) + Drizzle + RLS**. Mandantentrennung DB-erzwungen
  über Row-Level-Security; pro Request eine Transaktion mit
  `app.current_tenant` (`withTenant`). Major gepinnt (`postgres:18`). **Wichtig:**
  RLS gilt nur für Nicht-Superuser → der Request-Pfad verbindet mit einer eigenen
  App-Rolle (`DATABASE_URL`), Migrate-on-boot nutzt die Admin-Rolle
  (`MIGRATION_DATABASE_URL`).
- **[ADR 0013](./docs/adr/0013-objektspeicher-garage.md):** Objektspeicher =
  **Garage** (S3-kompatibel, self-hosted) statt MinIO; Single-Node, Image
  gepinnt, Bootstrap via `tools/garage/bootstrap.sh`. Bleibt intern bis das
  Bild-Upload-Feature es exponiert.
- **[ADR 0014](./docs/adr/0014-on-device-inferenz-praezision-fp32.md):**
  On-Device-Inferenz-Präzision = **fp32, einheitlich** für den Erkennungs-/
  Embedding-Pfad (Gate, Feinmodell, künftiger Embedding-Backbone); **int8
  verworfen**. Der **Embedding-Tap** (#88) wird auf einem kanonischen,
  deterministischen Pfad berechnet: **fp32 auf CPU (XNNPACK)** – Backend + Präzision
  sind Teil der Embedding-Versions-Identität. GPU/NPU-Delegates frei nutzbar für
  Inferenz, die **nicht** den Embedding-Korpus speist. Begründung u.a.:
  Korpus-Kompatibilität + irreversible Retention (gelöschte Fotos ⇒ Embeddings
  unwiederbringlich). Card-Art (#11) ausgenommen.
- **[ADR 0015](./docs/adr/0015-prozeduraler-kartenrahmen-svg.md):** Seltenheits-
  **Kartenrahmen** werden **prozedural mit `react-native-svg` gerendert** statt als
  PNGs gebündelt (#96; löst den Frame-Anteil von ADR 0011 ab). `RARITY_STYLES` ist
  die einzige Farbquelle; Geometrie (Glow/Ornamente) eskaliert mit der Stufe;
  Theme-Tokens (`primary`/`radius`) tönen den Rahmen → rebrandbar ohne Assets. Kein
  Bild-Override auf Vorrat; Altpfad (Frame-PNGs, `gen-ui-frames.py`,
  `ResolvedCardFrames`/`frames`-Prop, Branding-`cardFrames`) vollständig entfernt.
- **[ADR 0016](./docs/adr/0016-vererbte-kategorie-taxonomie-je-app.md):** *(Entwurf,
  vorgeschlagen)* **Vererbte Kategorie-Taxonomie innerhalb der White-Label-Apps** –
  **verfeinert** ADR 0002, ohne es abzulösen. White-Label je **Oberkategorie** bleibt
  (CarForge/PlantForge/AnimalForge, je App ein `appId`-Mandant + **ein** Fein-Modell,
  Multi-Tenant wie ADR 0012). **Innerhalb** jeder App eine Kategorie-Taxonomie
  (WordNet-verankert): Unterkategorien erben Attribute/Gate/Guardrails/Texte/Branding
  per Deep-Merge entlang der Ahnenkette; Battles pro attribut-tragendem Knoten,
  graceful degradation auf Vorfahren-Karten. Noch nicht akzeptiert.
- **[ADR 0017](./docs/adr/0017-world-data-quellen-und-lizenz.md):** *(Entwurf,
  vorgeschlagen)* **World-Data-Quellen & Lizenz (Fahrzeug-Korpus)** (#95) – Vorstufe zu
  #10/#76. **Zwei-Schichten-Korpus:** Identitäts-Layer aus **Wikidata (CC0)** (+ optional
  **NHTSA vPIC**, gemeinfrei) für den Objekt-ID-Raum (#72); **Stat-Layer nur für den
  erkennbaren Labelsatz (#9)**, weil Wikidatas trumpfbare Performance-Stats (`power`/
  `acceleration`/`topSpeed`) ≪ 5 % Coverage haben. `power`/`weight` aus **EEA (CC-BY)**,
  `acceleration`/`topSpeed`/`price` kuratiert (CC0) bzw. DBpedia. Lizenz-Leitplanke:
  **CC0 bevorzugt**, CC-BY zulässig, CC-BY-SA (DBpedia) nur bewusst/gekennzeichnet
  (viral aufs Daten-Artefakt). Beschaffung
  reproduzierbar/gepinnt unter `tools/fetch-world-data` (ADR 0006) inkl. Provenienz/Lizenz.
  Noch nicht akzeptiert.

Neue, wesentliche Architektur-Entscheidungen als weiteres ADR in `docs/adr/`
festhalten (durchnummeriert).

---

## Backlog & Arbeitsweise

- Wesentliche GDD-Aspekte sind als **Issues #2–#26** erfasst; Übersicht +
  Abhängigkeitsgraph im **Tracking-Issue #27**.
- Abhängigkeiten stehen als **`Blocked by: #…`** in jedem Issue (der GitHub-MCP-
  Server bietet keine native „blocked by"-Relation).
- Phasen-Label: **`phase:mvp`** vs. `phase:later`; Bereichs-Label `area:*`.
- **Milestone „MVP - CarForge" (#1)** bündelt alle `phase:mvp`-Issues.
- **Wurzeln (sofort/parallel startbar):** #2 (game-core Domänentypen) und #18
  (Backend Setup/Multi-Tenancy).
- Status: **Gerüst** – Workspace-Konfiguration, READMEs, `AppDefinition`-Schema
  und ausgefüllte cars-Variante stehen; Feature-Implementierung folgt.

---

## Konventionen

- Jedes Modul hat eine `README.md` mit Zweck, Grenzen und Abhängigkeiten – beim
  Implementieren aktuell halten.
- Code soll dem umgebenden Stil entsprechen (Kommentar-Dichte, Naming, Idiome).
- Commit-/PR-Sprache: Code/Doku überwiegend Deutsch (Projektkontext); technische
  Bezeichner Englisch.
- **Issue-Closing-Keywords immer Englisch.** GitHub schließt verlinkte Issues
  nur bei englischen Schlüsselwörtern automatisch: `Closes #N` / `Fixes #N` /
  `Resolves #N`. Deutsche Formulierungen („Schließt #4") werden **nicht**
  erkannt – im PR-Text daher stets das englische Keyword verwenden.
- Branch-Konvention dieses Projekts: Entwicklung auf dem zugewiesenen
  `claude/*`-Feature-Branch; nicht direkt auf `main` pushen.
- Build/Tasks (sobald implementiert): `pnpm dev | build | test | lint | typecheck`
  laufen über Turborepo. `APP_VARIANT` wählt die App (Default: `cars`).

---

## Rahmenbedingungen der Arbeitsumgebung

Diese Umgebung ist ephemer (frisch geklonter Repo-Container); Ergebnisse müssen
committet & gepusht werden.

- **GitHub-Schreibzugriff über die GitHub-MCP-Tools** (`mcp__github__*`). Issues
  anlegen/aktualisieren, PRs erstellen/aktualisieren, Milestone-Zuordnung laufen
  zuverlässig darüber.
- **`gh`-CLI ist installiert, aber sein Token (`GH_TOKEN`, fine-grained PAT) ist
  überwiegend read-only:** Lesen via `gh api` funktioniert, aber **Schreiben
  schlägt mit `403 Resource not accessible by personal access token` fehl** –
  u.a. Milestones anlegen und Issues bearbeiten (`updateIssue`). Daher:
  - **Milestones anlegen:** nicht automatisierbar – muss in der GitHub-UI
    geschehen; danach Zuordnung per `mcp__github__issue_write` (Feld `milestone`).
  - **Issue-/PR-Writes:** immer über `mcp__github__*`, nicht über `gh`.
  - `gh api` ist dennoch nützlich für **Lesen** (PR-State, Checks, Milestones,
    Branch-Vergleiche).
- **Repo-Scope der MCP-Tools:** aktuell auf `justb81/spotforge` beschränkt.
- **CI/CD:** GitHub Actions unter `.github/workflows/` – `ci.yml`
  (format/lint/typecheck/test/build via Turborepo), `mobile-build.yml`
  (EAS Build/Submit) und `mobile-update.yml` (EAS Update/OTA). Das **Backend**
  wird **nicht** über Actions deployt, sondern self-hosted auf **Coolify**
  (Build direkt aus dem Git-Repo via `apps/backend/Dockerfile`). Details:
  [`docs/deployment.md`](./docs/deployment.md) und
  [ADR 0003](./docs/adr/0003-ci-cd-und-deployment.md). Geteilte Tooling-Configs
  liegen in `@spotforge/config` (ESLint/Prettier/tsconfig).
- Git-Push: `git push -u origin <branch>`; nach dem Push einen PR (ready for
  review) eröffnen, falls noch keiner existiert.
- **Claude Cloud / Remote-Umgebung:** Das `send_later`-Tool (geplante
  Selbst-Erinnerung) ist hier **nicht verfügbar** – nicht danach suchen.
  PR-Nachverfolgung (CI-Abschluss, neue Pushes) stattdessen über einen
  `Monitor`-Poll abdecken, da Webhooks den CI-Erfolg nicht liefern.

---

## Gelernte Fallstricke (Mobile / On-Device) — bevor du Zeit verbrennst

Aus dem Car-Spotting-PoC (#48–#51) hart erkauft:

- **New Architecture ist Pflicht.** Expo SDK 56 / RN 0.85 erzwingen die New
  Architecture (Bridgeless); `expo prebuild` schreibt `newArchEnabled=true` und
  **ignoriert `newArchEnabled: false`** in `app.config`. Native Module, die das
  Legacy-Muster `NativeModules.X.install()` nutzen (z.B. `onnxruntime-react-native`
  bis 1.24.3), crashen dann mit **„Cannot read property 'install' of null"** beim
  Import. → On-Device-KI läuft über **ExecuTorch** ([ADR 0007](./docs/adr/0007-on-device-inference-executorch.md)).
  Neue native Libs vorab auf Bridgeless-Tauglichkeit prüfen.
- **APK direkt im Agent bauen.** Die Umgebung hat Android SDK (`ANDROID_HOME`,
  `ANDROID_SDK_ROOT`) + System-Gradle vorinstalliert. Fehlende SDK-Komponenten
  per `sdkmanager` nachrüsten (z.B. `"build-tools;35.0.0" "platforms;android-35"`),
  dann `expo prebuild --platform android --no-install` + `gradlew assembleRelease`
  direkt ausführen. Das APK anschließend per `adb install` oder Artefakt-Download
  sideloaden. Kein Emulator verfügbar – Akzeptanzkriterien auf echtem Gerät
  verifiziert der **Mensch**. `.github/workflows/poc-android-apk.yml` baut dasselbe
  APK in CI – **manuell (`workflow_dispatch`, auf jedem Branch) und automatisch per
  `pull_request`** für jeden PR, der einen den Build betreffenden Pfad ändert
  (`paths`-Filter: Mobile-Host, gebündelte Pakete, `variants/`, Modell-Beschaffung).
- **Standalone-Release crasht still?** Kein Metro-Overlay vorhanden → eine
  Error-Boundary, die Fehler **auf den Bildschirm** schreibt, ist Gold wert.
  Crasht es nativ **vor** dem Rendern (Splash → zu), hilft nur `adb logcat`.
- **`minimumReleaseAge` (7 Tage, ADR 0006)** blockiert taufrische Versionen:
  neue Pakete auf eine **≥7 Tage alte** Version pinnen (z.B. executorch `0.9.0`,
  nicht `0.9.1`), sonst scheitert der Install.
- **Modelle nie ins Git.** Bezug reproduzierbar über `tools/fetch-models`
  (Manifest + SHA-256) → als Metro-Asset (`.pte`) gebündelt; läuft in CI **vor**
  dem Bundle. Größere/fahrzeug-spezifische Modelle = eigener ExecuTorch-Export (#9).
- **`expo prebuild` verändert `apps/mobile/package.json`** (Scripts) und legt
  `android/`/`ios/` an (gitignored). Lokal danach `git checkout apps/mobile/package.json`
  und `rm -rf apps/mobile/android`. pnpm-Autolinking funktioniert ohne
  `node-linker=hoisted`.

---

## Spielmechanik-Kurzreferenz (Details im GDD)

- **Spot → Forge:** Spotten erzeugt **offline** einen **Draft** (Gate-Check +
  Marke/Modell); das **Forgen** ist **online** und server-autoritativ (World Data +
  Seltenheit + Freigabe neuer Karten), Status `draft → forged` (GDD §5.4, ADR 0010).
- **Seltenheit:** `f(Realwelt-Seltenheit × lokale Spotting-Dichte)` → C/U/R/E/L
  (GDD §5.3, ADR 0009). Die lokale Spotting-Dichte kommt aus einem adaptiven
  Standort-Raster (0/1/2 Nachkommastellen, Drill-down ab Schwelle `N`) +
  variantenspezifischem Ähnlichkeits-Schlüssel; Zähler server-autoritativ beim
  Forgen, Auswahl-Policy rein in `game-core` (`spottingDensity`).
- **Trumpf-Battle:** Attribut wählen, höherer Wert gewinnt den Stich;
  deterministisch über injizierten Seed (Client = Server).
- **Spezialfähigkeiten** ab Rare: Turbo, Schild, Wildcard, Fusion, Scout (§6.3).
- **Upgrades:** 3 Duplikate → Stufe 2 (+10%), Stufe 3 = Foil (+20%) (§7.3).
- **Monetarisierung:** F2P, nur Kosmetik/Komfort – **kein Pay-to-Win** (§9).
