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

**2. Lokale Spotting-Dichte.** Jede Karte trägt den **gerundeten** Fundort
   (long/lat auf **2 Nachkommastellen**, z.B. `48.12 / 9.51`; Raster ≈ 0,8 km²
   bei ~48° N — stadtteilgenau; exakte Koordinaten werden nicht gespeichert).
   Je dichter
   **ähnliche** Karten im selben Raster (innerhalb eines kategorie-spezifischen
   `locationFrequencyRadius`) bereits geforgt wurden, desto höher die Dichte ⇒
   desto häufiger ⇒ desto **geringer** die Seltenheit neuer Karten dort.
   Beispiel: Wer im Mercedes-Museum/in seiner Region viele gleiche Modelle
   forgt, erhält für weitere zunehmend geringere Seltenheit.

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
- **Privacy-first:** Es werden ausschließlich auf 2 Nachkommastellen gerundete
  Koordinaten (~0,8 km², stadtteilgenau) gespeichert, nie die exakte Position.
  Granular genug, um Spot-Cluster (Museum/Händlerhof) zu erfassen, ohne
  Bewegungsprofile auf Adressebene zu ermöglichen.
- **White-Label-konform:** Ähnlichkeits-Schlüssel und `locationFrequencyRadius`
  sind Konfiguration, kein gemeinsamer Code.

## Konsequenzen

- `computeRarity` (`packages/game-core`) nimmt nur noch `realWorldRarity`,
  `appSpottingFrequency` (= lokale Dichte ∈ [0,1]) und optional `curatedRarity`.
  Der frühere `locationBonus`-Faktor entfällt.
- Der Server (mandantenfähig, `appId`-skopiert) hält pro Kategorie den
  `locationFrequencyRadius`, führt die räumliche Dichte-Abfrage durch und
  vergibt die Seltenheit beim Forgen.
- Karten-Datenmodell braucht: gerundeter Fundort, Spotting-Zeitpunkt,
  Draft/Forged-Status.
- GDD §5.1/§5.3 sind bei Gelegenheit auf diese Definition nachzuziehen
  (Standort-Bonus → lokale Dichte; Draft/Forge-Flow).

## Offene Punkte

- **Reinheit von `game-core` (Punkt 1 der Diskussion, noch offen):** Wo genau
  verläuft der Schnitt? Die räumliche Zählung ist I/O und gehört auf den
  Server; die Frage ist, ob die **Abbildung Zähler → Dichte ∈ [0,1]** (z.B.
  sättigende Kurve `n / (n + k)`) als reine Funktion in `game-core` lebt und nur
  den Zähler von außen bekommt. Bis zur Klärung nimmt `computeRarity` die
  fertige Dichte entgegen.
- Zählbasis der Dichte: global, pro Variante, pro Spieler? (vermutlich global je
  `appId`).
- Verhalten an Raster-Grenzen (Nachbarzellen vs. echter Radius).
