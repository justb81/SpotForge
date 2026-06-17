# ADR 0012 – Backend-Datenbank: Engine & Betriebsmodell (self-hosted)

- **Status:** Akzeptiert
- **Datum:** 2026-06-17
- **Bezug:** ADR 0002 (Multi-Tenancy/appId), ADR 0003 (CI/CD, **Coolify self-hosted**),
  ADR 0005 (Node 24 LTS – „pin & deliberate upgrade"), ADR 0006 (Supply-Chain),
  Issues #18, #19, #21, #26

## Kontext

Der zentrale, mandantenfähige Server (#18) braucht einen **durablen,
transaktional-relationalen** Speicher.

- **Atomare Trades** (#21) → Multi-Row-ACID-Transaktion.
- **Idempotenter Offline-Sync** (#19) + Integrität `Tenant → Account → Card`.
- **Mandantentrennung** (#18, ADR 0002): zwei Apps sehen sich *nie*.
- **DSGVO** (#26).

Real-time (#20) liegt in **Redis**, Markt-Suche (#21) in **MeiliSearch** – nicht
Teil dieser Entscheidung. Das relationale Modell ist gesetzt.

**Harte Randbedingung (ADR 0003): Self-Hosting auf Coolify.** Damit scheiden
Managed-Cloud-DBs (Neon, Turso Cloud, Cockroach Cloud) aus. Konsequenzen:

- **DSGVO ist trivial erfüllt** – die Daten liegen ohnehin auf eigener Infra.
- **Der Upgrade-/Betriebsschmerz liegt wieder bei uns** (der ursprüngliche
  Schmerzpunkt). Die Engine-Wahl muss ihn *aktiv* adressieren.

Mit **Drizzle ORM** ist der SQL-Dialekt abstrahiert (Postgres- *oder*
SQLite-Familie) – die Wahl ist nicht vollständig irreversibel; RLS und
Postgres-Spezifika sind die Wechselkosten.

## Kandidaten (alle self-hosted auf Coolify)

### A) PostgreSQL (self-hosted Container/Resource)
Coolify-Standard mit automatisierten Backups. RLS, voller SQL-Funktionsumfang,
reifer Treiber (`postgres`), Drizzle-nativ.
**Upgrade-Realität:** Patch-Upgrades (18.3→18.4) = nur Image-Bump,
datenkompatibel, trivial. **Major-Upgrades** (18→19) brauchen `pg_upgrade` bzw.
Dump/Restore – das ist der „hakelige" Teil, aber **selten (jährlich) und
planbar**. Lässt sich exakt wie Node behandeln (ADR 0005): **Major pinnen
(`postgres:18`), bewusst als ADR-/PR-Schritt anheben**, nicht schleichend.

### B) libSQL / `sqld` (self-hosted SQLite-Server)
Open-Source-Server (MIT), Single-Binary über einer Datei → minimaler
Betrieb/Upgrade-Aufwand, konsistent mit der **On-Device-SQLite**. In-Memory-
SQLite macht CI/Tests extrem schnell.
**Aber:** **kein RLS** (Isolation nur per Code), **Single-Writer-Concurrency**
(WAL hilft nur Reads), und das **Sync-/Embedded-Replica-Tooling ist self-hosted
deutlich DIY-er** (Turso fokussiert dort die Cloud).

### C) CockroachDB (self-hosted Cluster)
**Rollende Online-Upgrades** – adressiert den Schmerzpunkt direkt. RLS ab v25.2.
**Aber:** sinnvoll nur als **3-Node-Cluster** (eigener Ops-Aufwand auf Coolify),
und seit 18.11.2024 **nur Enterprise-Lizenz** (frei <$10 M Umsatz, aber
**Telemetrie verpflichtend** im Free-Tier) – passt schlecht zu Privacy-first.

> Neon *self-hosted* ist theoretisch möglich (Open Source), aber betrieblich
> sehr aufwendig (Pageserver/Safekeeper-Architektur) → für Coolify unrealistisch,
> daher nicht als eigener Kandidat.

## Decision-Matrix (self-hosted)

| Kriterium (Gewicht) | A) PostgreSQL | B) libSQL/`sqld` | C) CockroachDB |
|---|---|---|---|
| **Tenant-Isolation / RLS** (hoch) | ✅ DB-erzwungen | ❌ nur Code-Scoping | ⚠️ RLS ab v25.2, jung |
| **Ops laufend** (hoch) | ✅ Single-Container, Coolify-Backups | ✅✅ Single-Binary/Datei | ❌ Cluster-Betrieb |
| **Upgrade-Schmerz** (hoch) | ⚠️ Patch trivial; Major selten+planbar (pin & deliberate) | ✅ minimal | ✅✅ rollend/online – aber Cluster |
| **Atomare Trades / ACID** (hoch) | ✅ voll | ✅ (Single-Writer ⇒ Tx trivial atomar) | ✅ verteilt |
| **Write-Concurrency** (mittel) | ✅ gut | ⚠️ SQLite-Single-Writer (Decke) | ✅✅ horizontal |
| **CI / DX** (mittel) | ✅ Container im CI / Testcontainers | ✅✅ In-Memory-SQLite | ⚠️ Cluster im CI aufwendig |
| **DSGVO / EU** (hoch) | ✅ self-hosted | ✅ self-hosted | ✅ self-hosted |
| **Lizenz / Supply-Chain** (mittel) | ✅ PostgreSQL-Lizenz, reif | ✅ MIT, schlank | ❌ Enterprise-Lizenz + Telemetrie-Zwang |
| **On-Device-Konsistenz** | – | ✅ = Offline-SQLite | – |

## Bewertung

- **C) CockroachDB:** Sein Alleinstellungsmerkmal (rollende Upgrades) ist genau
  das, was du suchst – wird aber durch **Cluster-Ops + Lizenz/Telemetrie**
  überkompensiert. Für ein kleines, self-hosted, privacy-first Team netto
  schlechter. **Raus.**
- **A vs. B** bleibt die Achse:
  - **A) Postgres:** einzige Option mit **DB-erzwungener Isolation (RLS)** – das
    harte #18-Akzeptanzkriterium „physisch garantiert". Laufender Betrieb auf
    Coolify ist ein einzelner Container mit Backups. Der gefürchtete Schmerz
    reduziert sich auf **seltene, bewusste Major-Upgrades** – beherrschbar nach
    dem **ADR-0005-Muster** (Major pinnen, deliberat anheben).
  - **B) libSQL:** **minimalster Betrieb/Upgrade** und schnellste Tests – aber
    **kein RLS** (Isolation nur per Code) und self-hosted ist die Sync-/Replica-
    Story DIY. Die Concurrency-Decke ist für ein Sammelkartenspiel real eher
    unkritisch, bleibt aber eine Wette.

## Entscheidung

**A) PostgreSQL self-hosted + Drizzle + RLS.** Unter dem Self-Hosting-Zwang ist
es die einzige Option, die die **starke, DB-erzwungene Mandantentrennung**
liefert, und der einzige reale Nachteil (Major-Upgrades) ist nach dem bewährten
**„pin & deliberate"-Muster (ADR 0005)** auf ein seltenes, geplantes Ereignis mit
Coolify-Backup begrenzt. **B) libSQL** war die Gegenoption (minimaler Betrieb >
DB-erzwungene Isolation); dank Drizzle-Dialekt-Abstraktion bliebe ein späterer
Wechsel A↔B überschaubar, falls die Concurrency-Decke je relevant wird.

## Konsequenzen

- **`postgres:18`** (neueste stabile Major; PostgreSQL kennt kein „LTS", jede
  Major = 5 Jahre Support) als Coolify-Resource (**Major gepinnt**),
  automatisierte Backups; Patch = Image-Bump, **Major-Upgrade nur als bewusster
  ADR-/PR-Schritt** (analog ADR 0005).
- **RLS** auf allen fachlichen Tabellen; pro Request eine Transaktion mit
  `SET LOCAL app.current_tenant = <appId>`; `tenantQuery()`-Helper als zweite
  Schicht (defense-in-depth).
- Datenzugriff via **Drizzle ORM**, Migrations via **`drizzle-kit`**
  (Versionen ≥7 Tage alt, ADR 0006).
- `docker-compose.yml`/`.env.example` bleiben auf self-hosted Postgres; CLAUDE.md-
  ADR-Liste um ADR 0012 ergänzen.
