# @spotforge/backend

API-Gateway und Echtzeit-Server (Node.js + Fastify).

## Verantwortung

- **Auth:** JWT + OAuth2 (Google, Apple Sign-In).
- **Karten-/Account-Persistenz:** PostgreSQL; Sync der on-device erzeugten Karten.
- **PvP & Battles:** Matchmaking, **autoritative Zug-Validierung** mit
  `@spotforge/game-core` (Anti-Cheat), Live-Battles über WebSockets/Socket.io.
- **Marktplatz & Tausch:** Angebote, Direkttausch, Suche via MeiliSearch.
- **Leaderboards & Seasons:** Redis.
- **Media:** S3-kompatibler Storage für (opt-in) geteilte Kartenbilder.

## Grenzen

Spielregeln werden **nicht** neu implementiert – die `game-core`-Engine ist die
einzige Wahrheit, identisch zur App.

## Abhängigkeiten

`@spotforge/game-core`. PostgreSQL, Redis, MeiliSearch, S3.

## Status

Gerüst – noch kein Fastify-Projekt initialisiert.
