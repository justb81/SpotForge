# ADR 0009 – Standortbasierte Spotting-Häufigkeit & Forge-Mechanik

- **Status:** Vorgeschlagen
- **Datum:** 2026-06-15
- **Bezug:** GDD §5.1/§5.3; ADR 0002 (White-Label/Multi-Tenancy); Issue #4
  (Seltenheits-Algorithmus). Berührt das noch offene Draft/Forge-Flow-Design.

## Kontext

GDD §5.3 definiert die Seltenheit als
`f(Realwelt-Seltenheit × App-Häufigkeit × Standort-Bonus) → C/U/R/E/L`,
lässt aber offen, **wie** die drei Faktoren zusammenspielen und was der
„Standort-Bonus" konkret ist. Beim Umsetzen von #4 fiel auf: Ohne diese
Definition ist jede Kombinationslogik geraten.

Zwei Beobachtungen treiben das Design:

- Ein reiner „untypischer-Fundort"-Bonus ist schwer datenseitig zu belegen.
- Ohne Gegenmechanik lässt sich Seltenheit **farmen** (an *einem* Ort – Museum,
  Händlerhof, Parkplatz – viele gleichartige Objekte spotten).

## Entscheidung

**1. „Standort-Bonus" entfällt als eigener Faktor.** Der Standort steckt
   stattdessen in der **App-Häufigkeit**, die als **lokale Spotting-Dichte**
   neu definiert wird. Die Seltenheits-Formel ist damit:

   ```
   percentile = realWorldRarity × (1 − lokaleSpottingDichte)   (∈ [0,1])
   rarity     = rarityFromPercentile(percentile)               (C/U/R/E/L)
   ```

   `realWorldRarity` (aus der Fakten-DB) bleibt als zweiter Faktor erhalten.

**2. Lokale Spotting-Dichte über ein adaptives Raster.** Jede Karte trägt den
   **gerundeten** Fundort. Statt einer festen Auflösung wird die Dichte über ein
   **adaptives Raster** (Quadtree-artig, drei Stufen) gemessen — die
   Dezimal-Rundung schachtelt sich dabei sauber ineinander:

   | Stufe | Rundung | Zellgröße (~48° N) | Charakter |
   |-------|---------|--------------------|-----------|
   | grob  | 0 NKS (1°)    | ≈ 8.270 km² | Region    |
   | mittel| 1 NKS (0,1°)  | ≈ 82 km²    | Stadt     |
   | fein  | 2 NKS (0,01°) | ≈ 0,8 km²   | Stadtteil |

   **Drill-down:** Beginnend bei der groben Stufe wird in die feinere Zelle
   gewechselt, **solange** dort mehr als `N` **ähnliche**, bereits geforgte
   Karten liegen (`N` = feste, kategorie-spezifische Verfeinerungs-Schwelle),
   max. bis zur feinen Stufe. Aus dem Zähler der erreichten Stufe folgt die
   Dichte über eine sättigende Kurve `count / (count + k)` (Default `k = N`).
   Je dichter ähnliche Karten beieinander geforgt wurden, desto höher die
   Dichte ⇒ desto häufiger ⇒ desto **geringer** die Seltenheit neuer Karten.

   Das löst zwei Probleme auf einmal: **Cold-Start** (wenige Spieler → grobe
   Zellen aggregieren genug Signal, statt jede Karte als „erste hier" = selten
   zu werten; zudem ankert `realWorldRarity` bei Dichte ≈ 0) und **Geografie**
   (dichte Städte werden fein, dünne Regionen bleiben grob) — ohne manuelles
   Umschalten der Auflösung über die Zeit. Beispiel: Wer im Mercedes-Museum
   viele gleiche Modelle forgt, drillt bis zur feinen Stufe → die Dichte steigt
   → weitere Karten werden zunehmend häufiger.

**3. Ähnlichkeit ist variantenspezifisch konfigurierbar.** *Welche*
   Kartenattribute in die Ähnlichkeit eingehen, definiert die `AppDefinition`
   der Variante (CarForge: z.B. Marke + Modell). `game-core` bleibt
   kategorie-neutral und kodiert **kein** Auto-Wissen (Goldene Regel #1).

**4. Snapshot-Semantik.** Seltenheit wird **einmalig beim Forgen** bestimmt und
   auf der Karte **eingefroren**. Bereits geforgte Karten verlieren ihren
   Seltenheitswert nicht, auch wenn die lokale Dichte später steigt.

**5. Spotten offline, Forgen online.**
   - **Spotten (offline):** legt nur einen **Karten-Entwurf** an (Bild +
     erkanntes Objekt + erkannte/manuell eingegebene Werte + gerundeter Ort +
     Zeitpunkt).
   - **Forgen (online, „Schmiede"):** wandelt Entwürfe in echte Karten. Die
     **Aufnahme-Reihenfolge** ist maßgeblich (frühere Sichtung am selben Ort =
     seltener). Die Dichte-Abfrage ist **server-autoritativ**.
   - Nur geforgte (Nicht-Draft-)Karten sind **spiel- und tauschbar**.

## Begründung

- **Anti-Farming / Pro-Exploration:** Belohnt das Auffinden neuer Objekte an
  neuen Orten statt das Abgrasen einer einzelnen Lokation.
- **GDD-treu, aber präzise:** Behält Realwelt-Seltenheit × Häufigkeit bei und
  füllt die undefinierte Lücke „Standort-Bonus" mit einer konkreten,
  messbaren Größe.
- **Privacy-first:** Es werden ausschließlich gerundete Koordinaten gespeichert
  (feinste Stufe ~0,8 km², stadtteilgenau), nie die exakte Position. Granular
  genug, um Spot-Cluster (Museum/Händlerhof) zu erfassen, ohne Bewegungsprofile
  auf Adressebene zu ermöglichen.
- **White-Label-konform:** Ähnlichkeits-Schlüssel und Verfeinerungs-Schwelle `N`
  sind Konfiguration, kein gemeinsamer Code.

## Reinheit von `game-core` (entschieden)

Der Schnitt verläuft so: Die räumlichen **Zählungen** (ähnliche Karten je
Rasterstufe) sind I/O und macht der **Server**. Die **Auswahl-Policy** — gegeben
die Zähler je Stufe (grob→fein) + `N` + `k` → gewählte Stufe und Dichte ∈ [0,1]
— ist eine **reine, deterministische Funktion** und lebt in `game-core`
(`spottingDensity`, `SpottingDensityConfig`). So rechnen App und Server identisch
und die Policy ist isoliert testbar.

## Konsequenzen

- `computeRarity` (`packages/game-core`) nimmt `realWorldRarity`,
  `appSpottingFrequency` (= lokale Dichte ∈ [0,1]) und optional `curatedRarity`.
  Der frühere `locationBonus`-Faktor entfällt.
- `spottingDensity(similarCountsCoarseToFine, { refineThreshold, saturationK })`
  liefert die `appSpottingFrequency` aus den server-seitig ermittelten Zählern.
- Der Server (mandantenfähig, `appId`-skopiert) rundet die Koordinaten auf 0/1/2
  Nachkommastellen, zählt ähnliche Karten je Stufe und vergibt die Seltenheit
  beim Forgen.
- Karten-Datenmodell braucht: gerundeter Fundort, Spotting-Zeitpunkt,
  Draft/Forged-Status.
- GDD §5.1/§5.3 sind bei Gelegenheit auf diese Definition nachzuziehen
  (Standort-Bonus → lokale Dichte; Draft/Forge-Flow).

## Offene Punkte

- Zählbasis der Dichte: global, pro Variante, pro Spieler? (vermutlich global je
  `appId`).
- Verhalten an Raster-Grenzen (Nachbarzellen vs. echter Radius).
