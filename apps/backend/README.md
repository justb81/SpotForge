# @spotforge/backend

**Ein zentraler, mandantenfähiger Server** für alle SpotForge-Apps
(Node.js + Fastify).

## Mandantenfähigkeit (Multi-Tenant)

Jede App identifiziert sich über ihre `appId` (= `AppDefinition.id`, z.B.
`cars`). Konten, Karten, Battles, Tausch und Leaderboards sind **pro App
getrennt**: Daten der Auto-App vermischen sich nicht mit denen anderer Apps.
Der Server wird von Anfang an mandantenfähig gebaut – app-übergreifende
Battles/Tausch bleiben dadurch **später zuschaltbar**, ohne Re-Design (siehe
[ADR 0002](../../docs/adr/0002-multi-app-single-codebase.md)).

## Verantwortung

- **Auth:** JWT + OAuth2 (Google, Apple Sign-In), Konto pro App-Mandant.
- **Karten-/Account-Persistenz:** PostgreSQL, `appId`-skopiert; Sync der
  on-device erzeugten Karten.
- **PvP & Battles:** Matchmaking innerhalb eines Mandanten, **autoritative
  Zug-Validierung** mit `@spotforge/game-core` (Anti-Cheat), Live-Battles über
  WebSockets/Socket.io.
- **Marktplatz & Tausch:** pro Mandant, Suche via MeiliSearch.
- **Leaderboards & Seasons:** Redis, pro Mandant.
- **Media:** S3-kompatibler Storage für (opt-in) geteilte Kartenbilder.

## Grenzen

Spielregeln werden **nicht** neu implementiert – die `game-core`-Engine ist die
einzige Wahrheit, identisch zu den Apps.

## Datenbank & Mandantentrennung (RLS)

Persistenz über **Drizzle ORM** auf **PostgreSQL**; die Trennung ist
**DB-erzwungen** über Row-Level-Security (ADR 0012). Jede fachliche Tabelle trägt
`app_id`; pro Request läuft eine Transaktion mit `app.current_tenant` (Helper
`withTenant`), sodass RLS nur Zeilen des Mandanten sichtbar/schreibbar macht.

**Zwei DB-Rollen** (wichtig – RLS gilt **nicht** für Superuser):

- `DATABASE_URL` → **Nicht-Superuser**-App-Rolle für alle Request-Queries.
- `MIGRATION_DATABASE_URL` → Admin/Superuser für **Migrate-on-boot**; legt dabei
  die App-Rolle idempotent an und grantet ihr Rechte.

Migrationen werden mit `pnpm --filter @spotforge/backend db:generate` aus dem
Schema erzeugt, **committet** (`migrations/`) und beim Start eingespielt
(Advisory-Lock; fail-fast).

## Auth

- **OAuth2** (Google/Apple): der Client schickt sein **ID-Token** an
  `POST /auth/login`; das Backend verifiziert es (JWKS + Audience, `jose`) und
  legt/holt das mandanten-gebundene Konto.
- **Eigene Tokens:** kurzlebiges Access-JWT (`@fastify/jwt`, an `appId` gebunden)
  + rotierendes Refresh-Token in Redis (`POST /auth/refresh`, `POST /auth/logout`).

Request-/Response-Formen kommen aus `@spotforge/api-contract` (geteilt mit dem
Client).

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/api-contract`. PostgreSQL, Redis,
MeiliSearch, S3 (Garage).

## Entwickeln & Bauen

```bash
cp ../../.env.example ../../.env                       # einmalig
docker compose -f ../../docker-compose.dev.yml up -d   # lokale Infra (Host-Ports)
pnpm --filter @spotforge/backend dev    # Fastify, tsx watch (läuft auf dem Host)
pnpm --filter @spotforge/backend build  # ESM-Bundle nach dist/ (tsup)
```

Endpunkte: `GET /health` (Liveness), `GET /ready` (Readiness – pingt DB + Redis).
`GET /me` (geschützt). Fachliche Routen erwarten den Mandanten-Header `x-app-id`.

## Deployment

Container-Build via `apps/backend/Dockerfile` (Build-Context = Repo-Wurzel).
Deployt auf **Coolify** direkt aus dem Git-Repo über `docker-compose.yml` (Ingress
nur via Traefik, ohne Host-Ports) – Schritt-für-Schritt in
[`docs/deployment.md`](../../docs/deployment.md).

## Status

Setup steht: Multi-Tenancy (RLS), Auth (OAuth + JWT/Refresh), Migrate-on-boot,
Health/Readiness. PvP/Marktplatz/Karten-Sync folgen in den weiteren Backend-Issues.
