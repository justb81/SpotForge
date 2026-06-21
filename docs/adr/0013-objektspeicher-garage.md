# ADR 0013 – Objektspeicher: Garage (S3-kompatibel, self-hosted)

- **Status:** Akzeptiert
- **Datum:** 2026-06-17
- **Bezug:** ADR 0003 (CI/CD, **Coolify self-hosted**), ADR 0012 (Backend-DB,
  self-hosted), ADR 0006 (Supply-Chain), Issues #18, #21
- **Privacy:** Fotos verlassen das Gerät nur per Opt-in (CLAUDE.md, GDD); der
  Objektspeicher hält ausschließlich **bewusst geteilte** Kartenbilder.

## Kontext

Geteilte Kartenbilder (opt-in) und perspektivisch Marktplatz-Assets brauchen
einen **S3-kompatiblen** Objektspeicher (Presigned URLs, Standard-SDKs). Unter
der harten Randbedingung aus ADR 0003 (**Self-Hosting auf Coolify**) scheiden
Managed-S3-Dienste (AWS S3, Cloudflare R2, Backblaze) aus – es muss ein Container
neben Postgres/Redis/MeiliSearch laufen.

Bisher stand **MinIO** als Platzhalter im Compose. Zwei Gründe sprechen dagegen:

- **Lizenz/Ausrichtung:** MinIO (AGPL) hat zuletzt Funktionen aus der Community-
  Edition entfernt und schiebt Richtung kommerzieller Tiers – schlechter Fit für
  ein kleines, self-hosted, privacy-first Setup.
- **Betriebsgewicht:** MinIO ist auf große Multi-Drive-Deployments ausgelegt;
  für einen einzelnen Coolify-Node ist das überdimensioniert.

## Kandidaten (alle self-hosted)

### A) Garage (Deuxfleurs)
Leichter S3-kompatibler Speicher (Rust, **AGPL-3.0**), explizit für **kleine,
self-hosted, geo-verteilte** Setups gebaut. Single-Binary, geringer
RAM/Disk-Overhead, einfache Bucket-/Key-Verwaltung über die `garage`-CLI.
Single-Node mit `replication_factor = 1` ist ein unterstützter, dokumentierter
Modus.

### B) MinIO
Reifstes Ökosystem, aber siehe oben (Lizenz-/Feature-Politik, Betriebsgewicht).

### C) SeaweedFS
Sehr leistungsfähig für riesige Datei-Mengen, aber größere Konzept-/Betriebs-
Fläche (Master/Volume/Filer) als für unseren Bedarf nötig.

## Entscheidung

**A) Garage**, Single-Node auf Coolify. Es deckt den S3-Bedarf (Presigned URLs,
SDK-Kompatibilität) bei **minimalem Betriebsgewicht** ab und passt zur self-
hosted, privacy-first Linie. MinIO als Platzhalter wird **ersetzt**, nicht
parallel gehalten (CLAUDE.md: vor 1.0 keine Altlasten).

## Konsequenzen

- **Image gepinnt** auf `dxflrs/garage:v1.0.1` (analog „pin & deliberate",
  ADR 0005/0006). Die Konfiguration (`replication_factor = 1`, LMDB-Metadaten)
  wird über ein dünnes `infra/garage/Dockerfile` (`FROM dxflrs/garage:v1.0.1` +
  `COPY garage.toml`) **fest ins Image gebacken** statt als Einzeldatei gemountet:
  Coolify legt fehlende Bind-Mount-Quellen als Verzeichnis an, wodurch ein
  `…/garage.toml:/etc/garage.toml`-Mount zum Verzeichnis wird und Garage mit
  „IO error: Is a directory" abbricht.
- **Bootstrap** (Layout → Key → Bucket → Rechte) ist **nicht** rein deklarativ in
  Compose abbildbar (Garage braucht die Node-ID zur Laufzeit) → einmaliges Skript
  `tools/garage/bootstrap.sh`; die erzeugten Schlüssel landen als
  `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` in der Env.
- **Netz/Exposure (Coolify, Traefik):** Garage bleibt **intern**, solange das
  Bild-Upload-Feature nicht aktiv ist. Wird es aktiv (Presigned URLs für die App),
  bekommt der S3-Endpunkt eine **eigene Subdomain** über Coolifys
  `SERVICE_FQDN_*`. Postgres/Redis/MeiliSearch bleiben grundsätzlich intern.
- **`.env.example`** trägt `S3_ENDPOINT`/`S3_REGION`/`S3_*`-Keys (Region `garage`);
  der Backend-S3-Client folgt mit dem Bild-Feature (nicht Teil von #18).
- **`rpc_secret`/`admin_token`** in der eingecheckten `garage.toml` sind
  Dev-Defaults (landen im Image); in Produktion **nicht** in der Datei ändern,
  sondern zur Laufzeit per Env `GARAGE_RPC_SECRET` / `GARAGE_ADMIN_TOKEN`
  überschreiben (Coolify-Service-Env).
- CLAUDE.md-ADR-Liste um ADR 0013 ergänzt.
