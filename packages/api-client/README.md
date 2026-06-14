# @spotforge/api-client

Typisierter Client für `@spotforge/backend` (REST + WebSocket). Wird von der App
genutzt.

## Verantwortung

- Typsichere Aufrufe für Auth, Karten-Sync, Marktplatz/Tausch, Leaderboards.
- WebSocket-Anbindung für Live-Battles.
- Teilt Request-/Response-DTOs mit dem Backend, damit Client und Server nicht
  auseinanderlaufen.

## Grenzen

Keine Spiellogik, kein UI. Reiner Transport + Typen.

## Abhängigkeiten

`@spotforge/game-core` (geteilte Domänentypen in DTOs).

## Status

Gerüst – Client-Oberfläche und DTO-Typen werden als Nächstes definiert.
