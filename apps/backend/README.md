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

## Abhängigkeiten

`@spotforge/game-core`. PostgreSQL, Redis, MeiliSearch, S3.

## Entwickeln & Bauen

```bash
cp ../../.env.example ../../.env     # einmalig
docker compose up -d                  # lokale Infra (von der Repo-Wurzel)
pnpm --filter @spotforge/backend dev  # Fastify, tsx watch
pnpm --filter @spotforge/backend build  # ESM-Bundle nach dist/ (tsup)
```

Endpunkte: `GET /health` (Liveness), `GET /ready` (Readiness). Fachliche Routen
erwarten den Mandanten-Header `x-app-id`.

## Deployment

Container-Build via `apps/backend/Dockerfile` (Build-Context = Repo-Wurzel).
Deployt auf **Coolify** direkt aus dem Git-Repo – Schritt-für-Schritt in
[`docs/deployment.md`](../../docs/deployment.md).

## Status

Gerüst – lauffähiger Fastify-Server mit Health/Readiness und `appId`-Hook.
Persistenz/PvP/Marktplatz folgen in den Backend-Issues.
