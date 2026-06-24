# @spotforge/api-contract

Geteilter **API-Vertrag** zwischen Backend und Client: Request-/Response-Formen
als [zod](https://zod.dev)-Schemata, daraus abgeleitete TypeScript-Typen.

## Zweck

Eine **einzige Quelle** für die Wire-Formate der Backend-API. Das Backend
(`@spotforge/backend`) validiert eingehende Requests damit; `@spotforge/api-client`
leitet daraus seine Typen ab. So driften Server und Client nicht auseinander.

## Inhalt

- **Auth** (`auth.ts`): `LoginRequest`, `RefreshRequest`, `AuthResponse`,
  `TokenPair`, `Account`, `OAuthProvider` – Login/Refresh-Fluss (siehe Issue #18).
- **Foto-Upload** (`photo.ts`, #89): `PHOTO_UPLOAD_CONSTRAINTS` (erlaubtes Format,
  max. Kantenlänge/Bytes) und `PhotoRejectionReason` – die geteilten Grenzen, die
  der Client bei der On-Device-Sanitisierung einhält und der Server (defense-in-depth)
  erzwingt.

Weitere Bereiche (Karten-Sync, Marktplatz, Battles) kommen mit den jeweiligen
Backend-Issues hinzu.

## Grenzen

- **Keine I/O, kein Framework.** Nur Schemata/Typen – pures, neutrales Paket.
- **Keine Spielregeln.** Domänenlogik bleibt in `@spotforge/game-core`.

## Abhängigkeiten

`zod`. Wird von `@spotforge/backend` und `@spotforge/api-client` genutzt.
