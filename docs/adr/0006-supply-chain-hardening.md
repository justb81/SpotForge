# ADR 0006 – Supply-Chain-Härtung (Mindestalter, Build-Skripte, Cooldown)

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0001 (Monorepo/pnpm), ADR 0003 (CI/CD), ADR 0005 (Node 24 LTS)

## Kontext

Kompromittierte npm-Pakete (Würmer/Schadcode in Updates) sind ein realer Angriffs-
vektor: Angreifer veröffentlichen eine bösartige Version, die – bis sie auffällt
und zurückgezogen wird – automatisch in Builds gezogen werden kann. Zwei
Einfallswege sind besonders relevant: (1) das **automatische Einziehen frischer
Versionen** (direkt oder transitiv) und (2) **Install-/Build-Skripte** von
Abhängigkeiten, die beim `install` beliebigen Code ausführen.

## Entscheidung

Mehrschichtige Härtung von Package-Manager **und** Dependabot:

1. **pnpm 11** als Paketmanager (`packageManager` in `package.json` gepinnt, inkl.
   Integritäts-Hash). pnpm 11 blockiert Dependency-Build-Skripte standardmäßig.
2. **Mindestalter / Quarantäne (`minimumReleaseAge: 10080` = 7 Tage)** in
   `pnpm-workspace.yaml`: pnpm löst nur Versionen auf, die mindestens 7 Tage in
   der Registry liegen, und verifiziert das Lockfile bei jedem Install dagegen.
   Schützt **jede** Installation – auch transitiv und bei manuellem `pnpm add`.
3. **Build-Skripte blockiert (`allowBuilds`)**: Nur explizit geprüfte Pakete
   dürfen Install-Skripte ausführen. Aktuell ist nur `esbuild` gelistet – und
   bewusst auf `false`, da es über seine vorinstallierten Plattform-Binaries
   (`@esbuild/*`) ohne eigenes Skript funktioniert.
4. **Dependabot-`cooldown` (7 Tage; Major 30 Tage)** für npm **und**
   github-actions: frische Releases werden erst nach Karenz als PR
   vorgeschlagen. An `minimumReleaseAge` angeglichen, damit Dependabot nichts
   vorschlägt, was pnpm beim Install ablehnen würde.

### Ausnahmen vom Mindestalter (`minimumReleaseAgeExclude`)

Das exakt gepinnte **Framework-Baseline** (Expo-SDK + React Native und deren
Build-/Transpile-Toolchain: `metro`, `hermes-*`, `babel-preset-expo` …) ist
ausgenommen. Gründe: Diese Versionen sind exakt festgelegt, werden **gemeinsam
über die Expo-SDK** gehoben (in Dependabot ohnehin ignoriert, siehe dortige
`ignore`-Liste) und lassen sich nicht auf eine gealterte Version herunterstufen.
Das Mindestalter greift damit gezielt für die **à-la-carte** hinzugefügten
Laufzeit-/App-Abhängigkeiten – den eigentlichen manuellen Einfallsweg.

## Begründung

- **Zeitfenster schließen:** Schad-Releases werden meist binnen Stunden bis
  Tagen erkannt und zurückgezogen. Eine 7-Tage-Quarantäne entschärft genau
  dieses Hochrisiko-Fenster, ohne Updates dauerhaft zu blockieren.
- **Defense-in-depth:** Dependabot-`cooldown` schützt den **Update**-Pfad,
  `minimumReleaseAge` zusätzlich **jeden** Install-Pfad, `allowBuilds` den
  **Ausführungs**-Pfad (Install-Skripte). Kein Einzelmechanismus ist alleinige
  Verteidigung.
- **Geringe Reibung:** Bei Aktivierung mussten nur wenige Dev-Tools auf ihre
  neueste *gealterte* Version zurückfallen (z. B. eslint 10.5.0 → 10.4.1,
  typescript-eslint 8.61 → 8.60) – funktional gleichwertig.

## Konsequenzen

- Lokale Erstinstallation lädt pnpm 11 via corepack; `node_modules` aus älteren
  pnpm-Versionen wird neu aufgebaut (in CI via `CI=true` ohne Rückfrage).
- Neue Abhängigkeiten/Versionen sind frühestens 7 Tage nach Release verfügbar;
  echte Sicherheits-Hotfixes ggf. gezielt über `minimumReleaseAgeExclude`
  bzw. Dependabot-Security-Updates (von `cooldown` ausgenommen) freigeben.
- Neue Pakete mit nötigen Build-Skripten müssen bewusst in `allowBuilds`
  freigegeben werden (`pnpm approve-builds`) – ein Review-Gate, kein Hindernis.
- Der Lockfile-Verify-Schritt benötigt Registry-Zugriff (Veröffentlichungsdaten);
  in CI/Coolify-Build gegeben.
