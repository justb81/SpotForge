# ADR 0005 – Node 24 LTS als fixierte Laufzeit-Baseline

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0003 (CI/CD & Deployment), ADR 0001 (Monorepo/TypeScript)

## Kontext

Das Monorepo lief zunächst auf einer offenen Node-Range (`engines.node` `>=20`,
`.nvmrc` `20`). Mit dem Upgrade auf ESLint 10 (verlangt
`^20.19.0 || ^22.13.0 || >=24`) und dem Wunsch nach einer aktuellen, einheitlichen
Laufzeit stellte sich die Frage nach der Ziel-Node-Version – inklusive der
neueren Linien 25 (Current) und perspektivisch 26.

Node folgt einem festen Release-Schema:

- **Gerade** Major-Versionen (22, 24, 26 …) werden **LTS** → ~30 Monate Wartung,
  für Produktion vorgesehen.
- **Ungerade** Versionen (23, 25 …) sind **„Current"** → nur ~8 Monate Support,
  kein LTS; für produktive Backends nicht empfohlen.

## Entscheidung

1. **Node 24 (Active LTS) ist die verbindliche Laufzeit** für das gesamte
   Repo – App-Tooling **und** das self-hosted Backend.
2. **Fix auf die 24er-Linie:** `engines.node` = `24.x` (nicht `>=24`), damit nicht
   versehentlich auf einer Current-Linie (25) gebaut/deployt wird. `.nvmrc` = `24`
   und das Backend-Image `node:24-alpine` ziehen jeweils das neueste 24.x-Patch.
3. **`@types/node` an die Laufzeit gekoppelt:** Floor `^24`, und Dependabot
   ignoriert Major-Updates (`.github/dependabot.yml`) → bleibt auf der 24.x-Linie.
4. **Kein Docker-Ecosystem in Dependabot:** Das Base-Image bleibt bewusst auf dem
   `node:24`-Tag gepinnt und wird nicht automatisch auf 25/26 angehoben.
5. **Neubewertung bei Node 26 LTS** (planmäßig ~Okt 2026): dann als bewusster,
   gebündelter Schritt anheben (`.nvmrc`, `engines`, Dockerfile, tsup-Target,
   `@types/node`, Dependabot-Kommentar) – nicht schleichend via Dependabot.

## Begründung

- **Produktionsstabilität vor Neuheit.** Der Coolify-gehostete Fastify-Server
  profitiert von langer Wartung/Sicherheitsupdates der LTS-Linie; Current-Linien
  fallen nach ~8 Monaten aus dem Support.
- **Einheitlichkeit Client/Server.** Eine einzige Node-Major über CI, lokale
  Entwicklung (`.nvmrc`) und Runtime reduziert „works-on-my-machine"-Drift.
- **Werkzeug-Kompatibilität.** ESLint 10, die React-Native-/Expo-Toolchain und
  `@types/node@24` decken Node 24 sauber ab.
- **Pinnen statt offener Range.** `>=24` würde auf einem Build-Host mit Node 25/26
  klaglos eine nicht freigegebene Laufzeit nutzen; `24.x` macht die Entscheidung
  explizit und überprüfbar.

## Konsequenzen

- Lokale Entwicklung erfordert Node 24 (siehe `.nvmrc`); bei abweichender lokaler
  Version warnt pnpm (kein `engine-strict`), CI nutzt via `node-version-file`
  garantiert Node 24.
- Greift automatisch in allen Workflows (`ci.yml`, `mobile-build.yml`,
  `mobile-update.yml`), da diese `node-version-file: .nvmrc` verwenden.
- Der Wechsel auf die nächste LTS (26) ist ein bewusster ADR-/PR-Schritt, kein
  automatischer Dependabot-Bump.
