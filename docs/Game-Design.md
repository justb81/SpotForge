# SpotForge – Game Design Document (GDD)
*Version 1.0 | Juni 2026 | Erstellt für KI-gestützte Weiterentwicklung*

***

## 1. Executive Summary

**SpotForge** ist ein Mobile-Game, das drei bewährte Spielmechaniken zu einem neuartigen Erlebnis kombiniert: **Real-World Spotting**, **KI-generierte Sammelkarten** und **Trumpf-Kartenspiel** (Top-Trumps-Mechanik). Spieler fotografieren Objekte aus der echten Welt – Autos, Tiere, Flugzeuge, Baumaschinen, Pflanzen und mehr – eine lokale KI-Engine erkennt das Objekt, ermittelt reale Fakten und schmiedet daraus (*to forge*) eine einzigartige digitale Sammelkarte. Diese Karten können gesammelt, getauscht und in Trumpf-Duellen gegen andere Spieler eingesetzt werden.

Das Alleinstellungsmerkmal gegenüber bestehenden Apps liegt in der **kategorie-übergreifenden** Konzeption: Während CarDex[^1][^2] nur Fahrzeuge kennt, Skycards by Flightradar24[^3][^4] nur Flugzeuge abdeckt und WildcardDex[^5] ausschließlich Natur-Organismen erkennt, vereint SpotForge alle Kategorien in einem gemeinsamen Karten- und Battle-System. Die lokale KI-Verarbeitung schützt die Privatsphäre und ermöglicht Offline-Nutzung.

***

## 2. Markt- & Wettbewerbsanalyse

### 2.1 Bestehende Lösungen und Abgrenzung

| App | Kategorien | Karten-TCG | Trumpf-Modus | Multi-Kategorie | Lokal-KI |
|---|---|---|---|---|---|
| **CarDex**[^1][^2] | Nur Autos | ✅ | ❌ | ❌ | ❌ |
| **Skycards (Flightradar24)**[^3][^6] | Nur Flugzeuge | ✅ | Battles | ❌ | ❌ |
| **WildcardDex**[^5] | Nur Natur/Tiere | ✅ | ✅ (Premium) | ❌ | ❌ |
| **RealDex**[^7] | Nur Wildtiere | ✅ | ❌ | ❌ | ❌ |
| **Car Identifier (CarID)**[^8][^9] | Nur Autos | ✅ | ❌ | ❌ | ❌ |
| **Top Drives**[^10] | Nur Autos (virtuell) | ✅ | Race-Battles | ❌ | ❌ |
| **MakeACard / AI TCG**[^11][^12] | Alles (Upload) | ✅ | ❌ | ✅ | ❌ |
| **SpotForge** | Alle Kategorien | ✅ | ✅ | ✅ | ✅ |

### 2.2 Marktlücke

Die Kombination aus (1) fotografiebasiertem Real-World-Spotting, (2) multi-kategorischer KI-Kartengenerierung und (3) integriertem Trumpf-Duell-System existiert als eigenständige App nicht[^1][^3][^5][^7]. Das Trumpf-Kartenspiel (bekannt als „Top Trumps"[^13] oder „Supertrumpf") ist ein bewährtes, weltweit gespieltes Format[^14][^15], das bisher nicht mit Real-World-Spotting kombiniert wurde.

***

## 3. Core Game Loop

```
SPOT → FORGE → COLLECT → BATTLE/TRADE
  ↑                              |
  └──────────────────────────────┘
```

1. **SPOT** – Spieler fotografiert ein Objekt; eine **lokale KI** prüft sofort die
   Kategorie (Gate) und erkennt – bei Treffer – Marke/Modell. Es entsteht **offline**
   eine **Draft-Karte** (aufgenommenes Foto + erkanntes Objekt), die der Spieler
   bestätigen, korrigieren oder mit eigenen Attributvorschlägen ergänzen kann.
2. **FORGE** – Der Spieler reicht Draft(s) **online** in der Schmiede ein (einzeln
   oder als Bulk). Der **Server** ermittelt die Kartendaten aus **World Data** und
   berechnet **autoritativ die Seltenheit**; neue/unbekannte Objekte gehen in einen
   **Freigabeprozess**. Die Karte wechselt auf Status **„forged"**.
3. **COLLECT** – Die geschmiedete Karte wird ins persönliche Deck/Sammlung aufgenommen
4. **BATTLE/TRADE** – Spieler duellieren sich mit Trumpf-Mechanik oder tauschen Karten

***

## 4. Kategorien & Kartenattribute

### 4.1 Haupt-Kategorien (mit Emoji-Identifier)

| Kategorie | Emoji | Beispiele | Primäre Trumpf-Attribute |
|---|---|---|---|
| 🚗 **Fahrzeuge** | Auto | PKW, Motorräder, LKW, Busse | PS, 0–100 km/h, Höchstgeschwindigkeit, Gewicht, Preis |
| ✈️ **Luftfahrt** | Flugzeug | Jets, Propeller, Hubschrauber | Reichweite, Höchstgeschwindigkeit, Passagiere, Triebwerke, Gewicht |
| 🦁 **Tiere** | Tier | Wildtiere, Haustiere, Vögel, Insekten | Gewicht, Geschwindigkeit, Lebensspanne, Körperlänge, Schutzstatus |
| 🌿 **Pflanzen** | Pflanze | Bäume, Blumen, Sträucher | Wuchshöhe, Alter, Giftigkeit, Verbreitungsgebiet, Seltenheit |
| 🏗️ **Baumaschinen** | Bagger | Kräne, Bagger, Bulldozer, Walzen | Gewicht, Hubkraft, PS, Preis, Arbeitsbreite |
| 🚢 **Wasserfahrzeuge** | Schiff | Containerschiffe, Boote, U-Boote | Verdrängung, PS, Reichweite, Kapazität, Baujahr |
| 🚂 **Schienenfahrzeuge** | Zug | Züge, U-Bahnen, Straßenbahnen | Höchstgeschwindigkeit, PS, Länge, Fahrgastkapazität |
| 🏛️ **Bauwerke** | Gebäude | Brücken, Türme, Hochhäuser | Höhe, Baujahr, Kosten, Stockwerke |
| 🍄 **Pilze & Sporen** | Pilz | Speisepilze, Giftpilze, Schimmelpilze | Giftigkeit, Größe, Seltenheit, Fundort |
| 🌍 **Gestein & Mineralien** | Stein | Kristalle, Fossilien, Edelsteine | Härte (Mohs), Seltenheit, Alter, Fundort |

### 4.2 Kartenattribute nach Kategorie

Die spielbaren Attribute jeder Kategorie sind **deklarativ** in `data/categories/<id>.json` definiert (Source of Truth, abgebildet auf `CategoryDefinition`/`AttributeDefinition` in `game-core`). Pro Kategorie gibt es mehrere **Kern-Attribute**; jedes ist markiert als

- **trumpffähig** – im Trumpf-Duell wählbar (§6), oder
- **informativ** – nur Anzeige/Sammelreiz, nie kampfentscheidend,

je mit Einheit und Vergleichsrichtung (`higherIsBetter`). **Anzahl und Trumpf-Auswahl variieren je Kategorie** – es gibt keine feste Quote; jedes einigermaßen kompetitive Merkmal sollte trumpffähig sein.

Unabhängig vom Kategorieschema trägt jede Karte **kategorie-neutrale Sonderwerte** (im `Card`-Modell, nicht im Attributschema):

- **Seltenheit** (Common / Uncommon / Rare / Epic / Legendary) – algorithmisch bestimmt (§5.3); **nur durch Real-World-Spotting** erreichbar (§9.3), nicht durch Upgrades
- **Erstellungsdatum & GPS-Region** – für Geo-Events nutzbar
- **Spotted-By** – Creator-Tag des Entdeckers
- **Level/Foil-Boost** – Attributwerte durch Upgrades steigerbar (§7.3); ändert **nicht** die Seltenheit

***

## 5. KI-Engine & Schmiede (Spot on-device, Forge online)

### 5.1 On-Device-Spot-Pipeline (offline → Draft)

```
Foto-Input
    │
    ▼
[Zwei-Stufen-Kaskade]              ← lokal & gebündelt (ExecuTorch/.pte), ADR 0007/0008
  Gate: „ist es ein Fahrzeug?"     → bei Reject: Hinweis inkl. erkannter Klasse
    │ akzeptiert
    ▼
  Feinmodell: Marke + Modell       → Objekt-Label
    │
    ▼
[Draft-Karte]                      → aufgenommenes Foto + erkanntes Objekt, Status „draft"
    │   Spieler bestätigt / korrigiert / schlägt Attributwerte vor
    ▼
Lokale Draft-Sammlung (offline)    → wartet auf das Forgen (§5.4)
```

Die Spot-Pipeline läuft **vollständig on-device und offline** und erzeugt nur
einen **Entwurf** (Draft), keine fertige Karte. Reale Stats und Seltenheit kommen
autoritativ aus der **Online-Schmiede** (§5.4). Ein automatischer Zuschnitt des
Fotos auf das erkannte Objekt (Bounding-Box/Detection) ist ein späteres Thema;
vorerst speichert der Draft das aufgenommene Foto.

### 5.2 Technische Anforderungen

- **Klassifikation:** Zwei-Stufen-Kaskade – breites ImageNet-Gate (EfficientNet-B0,
  fp32, recall-lastig) + Feinmodell Marke/Modell (EfficientNet-B4), fest gebündelt
  je Variante (ADR 0008)
- **Offline-Fakten-DB (SQLite + FTS5):** liefert nur **provisorische Vorschläge** für
  den Draft und die Offline-Anzeige – **nicht** die autoritativen Werte
- **World Data (server-seitig):** autoritative Attribute beim Forgen (§5.4),
  mandantenskopiert je App-Kategorie (ADR 0002)
- **Card-Art:** ExecuTorch (`.pte`), generiert beim/nach dem Forgen (Seltenheits-Rahmen)
- **Seltenheits-Algorithmus:** **server-autoritativ** beim Forgen (§5.3, ADR 0009);
  der Client trägt bis dahin einen Platzhalter
- **Fallback:** unbekanntes Objekt → Freigabe-/Kuratierungsprozess (§5.4)

### 5.3 Seltenheits-Berechnung

Seltenheit ergibt sich aus **Realwelt-Seltenheit** und **lokaler Spotting-Dichte**
(ADR 0009 – der frühere „Standort-Bonus" ist darin aufgegangen):

```
percentile = realWorldRarity × (1 − lokaleSpottingDichte)   (∈ [0,1])
rarity     = rarityFromPercentile(percentile)               → C/U/R/E/L

Common     (C)  = Top 60% aller gespotteten Objekte
Uncommon   (U)  = Top 20–60%
Rare       (R)  = Top 5–20%
Epic       (E)  = Top 1–5%
Legendary  (L)  = < 1% (oder manuell kuratiert)
```

Beispiel: Ein VW Golf ist **Common**, ein Ferrari LaFerrari ist **Rare**, ein Bugatti Veyron ist **Epic**, ein bestimmter Prototyp-Rennwagen ist **Legendary**.

Die Berechnung erfolgt **server-autoritativ beim Forgen** (§5.4); die lokale
Spotting-Dichte führt der Server über ein adaptives Standort-Raster (ADR 0009).

### 5.4 Online-Schmiede (Forge)

Das **Forgen ist ein Online-Schritt** (das Spotten/Draften bleibt offline, §5.1).
Der Spieler reicht eine oder – per **Bulk** – mehrere Draft-Karten beim Server ein:

1. **World-Data-Lookup:** Der Server ermittelt zum erkannten Objekt die realen
   Attribute aus der zentralen **World Data** (mandantenskopiert, je App-Kategorie).
2. **Autoritative Seltenheit:** Der Server berechnet die Seltenheit (§5.3) mit der
   server-seitig geführten lokalen Spotting-Dichte (ADR 0009). Bis dahin trägt die
   Karte nur einen Platzhalter.
3. **Freigabeprozess für Neues:** Ist das Objekt unbekannt oder schlägt der Spieler
   abweichende Daten vor, wandern diese in einen **Kuratierungs-/Freigabeprozess**;
   erst nach Freigabe fließen sie in die World Data zurück.
4. **Status „forged":** Nach erfolgreichem Forgen wechselt die Karte von `draft`
   auf `forged` und wird in die Sammlung des Spielers einsortiert.

**Privacy:** Eingereicht werden Draft-Metadaten (erkanntes Objekt + Attribut-
vorschläge), **nicht** das Foto – das verlässt das Gerät nur per Opt-in (§10.4).

***

## 6. Trumpf-Spielmodus (Battle)

### 6.1 Grundregeln (klassisches Supertrumpf[^13])

Das Basis-Gameplay folgt dem bewährten Top-Trumps-Prinzip[^13][^14]:

1. Beide Spieler haben ein Deck (5–20 Karten)
2. Aktiver Spieler wählt ein Attribut seiner obersten Karte
3. Beide Karten werden verglichen – höherer Wert gewinnt den Stich
4. Gewinner nimmt beide Karten ans Ende seines Decks
5. Wer am Ende alle Karten hat, gewinnt

### 6.2 Erweiterte Modi

> Alle Modi spielen **innerhalb einer Kategorie** (White-Label: je App eine Kategorie, siehe [ADR 0002](./adr/0002-multi-app-single-codebase.md)). Es gibt bewusst keinen kategorieübergreifenden Modus.

**Modus 1: Klassisch (1v1 Turnier)**
- Jeder Spieler baut sein Deck aus gespotteten Karten
- Standardregeln nach dem Top-Trumps-Prinzip[^13]
- Rangliste mit wöchentlichen Seasons

**Modus 2: Speed Spotting Battle (Async PvP)**
- Beide Spieler haben 24 Stunden Zeit, 5 neue Karten zu spotten
- Beste 5 Karten treten gegeneinander an
- Ziel: Wer hat die selteneren Karten gespottet?

**Modus 3: Team Expedition**
- 2vs2 oder 3vs3
- Gemeinsames Deck aus allen Mitglieder-Karten
- Koordinierter Attribut-Einsatz

### 6.3 Spezialfähigkeiten (Karten-Abilities)

Jede Karte der Seltenheit Rare oder höher bekommt eine **Spezialfähigkeit**:

| Fähigkeit | Effekt |
|---|---|
| **Turbo** | Erhöht ein Attribut einmalig um 20% |
| **Schild** | Schützt einmal vor einem Attribut-Verlust |
| **Wildcard** | Wählt das beste eigene Attribut automatisch |
| **Fusion** | Kombiniert zwei Karten temporär zu einer Super-Karte |
| **Scout** | Sieh das oberste Attribut der gegnerischen Karte vor der Wahl |

***

## 7. Sammel- & Progressionssystem

### 7.1 Spieler-Profil

- **Level-System** (1–100): XP durch Spotting, Gewinne, Challenges
- **Titel-System:** Rookie Spotter → Pro Spotter → Expert Forge → Master Forge → Legendary Spotter
- **Persönliche Statistiken:** Gespottete Objekte, Siege, Tauschrate, Gesamtseltenheit

### 7.2 Deck-Management

- **Basiskapazität:** 50 Karten im Besitz
- **Erweiterungen:** Durch Level-Ups oder In-App-Käufe
- **Duplikate:** Mehrfach gespottete Karten können als **Upgrade-Material** für bestehende Karten verwendet werden

### 7.3 Karten-Upgrades

```
Karte (Stufe 1)
    + 3x Duplikate
    = Karte (Stufe 2) → +10% auf alle Attribute
    
Karte (Stufe 3) = Gilt als "Foil"-Version (visueller Effekt + +20% Attribut-Boost)
```

### 7.4 Achievements & Daily Challenges

- **Daily Spot Challenge:** Heute ein Tier in freier Wildbahn spotten (+50 XP)
- **Category Completionist:** Alle Fahrzeugstypen einer Region spotten
- **Geo-Hunter:** Karten in 5 verschiedenen Städten erstellen
- **Battle Champion:** 10 Duelle in Folge gewinnen

***

## 8. Soziale Features & Tauschsystem

### 8.1 Karten-Tausch

- **Direkttausch (1:1):** Spieler bieten Karte an und wünschen sich eine spezifische Karte
- **Marktplatz:** Karten zum Tausch anbieten mit Such- und Filteroptionen
- **Blind Pack Swap:** Zufallskarte gegen Zufallskarte (für schnellen Austausch)
- **Trade-Schutz:** Duplikat-Prüfung verhindert ungewollte Abgabe einzigartiger Karten

### 8.2 Community-Features

- **Spot-Feed:** Teile spektakuläre Funde mit der Community
- **Collections Showcase:** Präsentiere deine besten Karten im Profil
- **Spot-Map:** Globale Karte aller gespotteten Objekte (anonymisiert)
- **Clans/Gilden:** Gruppen von Spottern mit gemeinsamen Expeditionszielen

### 8.3 Freunde & Challenges

- **Freundschafts-Duell:** 1v1 Challenges an Freunde schicken
- **Spot-Wette:** Wer findet zuerst ein Legendary-Tier in eurer Stadt?
- **Clan-Events:** Wöchentliche Event-Challenges für Gruppen

***

## 9. Monetarisierungsmodell

### 9.1 Free-to-Play-Grundsatz

**SpotForge ist vollständig kostenlos spielbar.** Alle Kernfunktionen (Spotting, Karten erstellen, Battles, Tausch) sind ohne Bezahlung nutzbar. Kein Pay-to-Win.

### 9.2 Einnahmequellen

| Kategorie | Beschreibung | Preisbeispiel |
|---|---|---|
| **Forge Pass** (Abo) | Premium-Saison-Pass mit exklusiven Card-Designs, Extra-Deck-Slots, Ad-free | 2,99 €/Monat |
| **Card Frame Packs** | Kosmetische Karten-Rahmen, Foil-Effekte, Hintergrunddesigns | 0,99–4,99 € |
| **Deck-Erweiterungen** | Zusätzliche Karten-Slots | 1,99 € (50 Slots) |
| **Spot-Boosts** | Erhöhte Seltenheitschance beim nächsten Spot für 24h | 0,99 € |
| **Creator-Pack** | Individuelle Karten-Gestaltungselemente für Profil-Branding | 4,99 € |

### 9.3 Anti-Pay-to-Win-Garantie

- Kaufbare Items betreffen ausschließlich Kosmetik oder Komfort
- Keine kaufbaren Karten mit besseren Stats
- Karten-Seltenheit ist ausschließlich durch Real-World-Spotting erreichbar

***

## 10. Technische Architektur

### 10.1 Frontend (Mobile App)

```
Plattform:    React Native (iOS + Android) oder Flutter
State Mgmt:   Zustand / Redux Toolkit
UI-Framework: NativeBase oder Tamagui
Animationen:  Reanimated 3 + Lottie
Kamera:       Vision Camera v4 mit Frame-Processor
```

### 10.2 Backend-Architektur

```
API Gateway:      Node.js / Express oder Fastify
Datenbank:        PostgreSQL (Spieler, Karten, Matches)
                  Redis (Sessions, Leaderboards, Real-Time)
Auth:             JWT + OAuth2 (Google, Apple Sign-In)
Media Storage:    S3-kompatibel (Karten-Bilder)
Real-Time:        WebSockets / Socket.io (Live-Battles)
Suche:            MeiliSearch (Karten-Marktplatz-Suche)
```

### 10.3 On-Device-KI-Stack

```
Framework:        ExecuTorch (react-native-executorch, .pte)  [ADR 0007]
Klassifikation:   Zwei-Stufen-Kaskade – breites ImageNet-Gate
                  (EfficientNet-B0, fp32) + Feinmodell Marke/Modell
                  (Jordo23, EfficientNet-B4)                  [ADR 0008]
Card-Art:         LCM (Latent Consistency Model) quantisiert
                  oder Stable Diffusion v2.1 (4-bit quantized)
Offline-DB:       SQLite + FTS5 (Full-Text-Search für Fakten)
Modelle:          fest ins APK gebündelt je Variante – kein
                  Nachladen/OTA                               [ADR 0008]
```

### 10.4 Datenschutz & Offline-First

- **Fotos verlassen das Gerät nur mit expliziter Zustimmung** (Opt-in für Community-Feed);
  auch das **Forgen** lädt **kein Foto** hoch, sondern nur Draft-Metadaten (erkanntes
  Objekt + Attributvorschläge)
- **KI-Inference (Spotten/Erkennen) vollständig on-device** – das Erstellen eines
  Draft-Entwurfs braucht kein Netz
- **DSGVO-konform:** Standortdaten werden nur grob (PLZ-Ebene) gespeichert
- **Offline-Modus:** **Spotten & Draft-Erstellung** funktionieren offline; das **Forgen**
  (World-Data + autoritative Seltenheit, §5.4) erfordert eine Verbindung – Drafts werden
  bei Verbindung eingereicht

***

## 11. Onboarding & Tutorial

### 11.1 First-Time-User-Experience (FTUE)

1. **Willkommen-Screen:** Kurze Animations-Sequenz zeigt den Core Loop (10 Sekunden)
2. **Erster Spot:** Spieler wird direkt aufgefordert, ein Objekt zu fotografieren (kein langer Tutorial-Text)
3. **Karten-Schmiedung:** Animierte Darstellung, wie die Karte „geschmiedet" wird
4. **Erstes Battle:** Tutorial-Duell gegen KI-Gegner mit geführten Hinweisen
5. **Tausch-Demo:** Simulierter Tausch mit einem Demo-Account
6. **3 Starter-Karten:** Jeder neue Spieler erhält 3 Common-Karten als Geschenk

### 11.2 Progressive Disclosure

- Advanced Features (Fusion, Clan-Events, Marktplatz) werden stufenweise bei Level-Ups freigeschaltet
- Kontextuelle Tooltips statt Info-Dump zu Beginn

***

## 12. Spielwelt & Lore (optional / erweiterbar)

SpotForge hat eine optionale narrative Ebene für vertieftes Engagement:

**Hintergrundstory:** Die Welt hat begonnen, ihre physischen Objekte als "Essenzen" zu manifestieren – jedes Objekt besitzt eine verborgene Energie, die nur durch das SpotForge-Gerät sichtbar wird. Spieler sind **"Forger"** – Entdecker, die die Essenz der realen Welt einfangen und in mächtige Karten verwandeln. Die seltensten Karten sollen die mächtigsten Kräfte der Welt repräsentieren.

Diese Lore ist bewusst optional – das Kernspiel funktioniert vollständig ohne diese Ebene.

***

## 13. Roadmap (Post-Launch)

### Phase 1 – MVP (Launch)
- Kategorien: Fahrzeuge, Tiere, Luftfahrt
- Basis-Trumpf-Modus (1v1 Klassisch)
- Direkttausch
- iOS + Android

### Phase 2 – Expansion (3 Monate post-Launch)
- Neue Kategorien: Baumaschinen, Wasserfahrzeuge, Pflanzen
- Speed Spotting Battle
- Freundesliste + Herausforderungen
- Clan-System

### Phase 3 – Community (6 Monate post-Launch)
- Marktplatz
- Geo-Events (regionale Challenges)
- Web-Dashboard für Sammlungen

### Phase 4 – Ecosystem (12 Monate post-Launch)
- Creator-Tools (eigene Kategorie-Vorschläge einreichen)
- API für externe Entwickler (Spots als Datenbasis)
- Physische Karten (Print-on-Demand der eigenen Sammlung)
- Augmented Reality (AR-Overlay beim Spotting)

***

## 14. Namensbegründung

**SpotForge** ist der empfohlene Name aus folgenden Gründen:

- **Spot** = Kernmechanik (spotten, entdecken)
- **Forge** = Schmieden (Karte aus einem Fund erschaffen) – einprägsames Verb, das den kreativen Akt beschreibt
- **Keine Kollision** mit bestehenden Apps: SpotForge existiert lediglich als kleines, thematisch völlig unverwandtes Storyboard-CLI-Tool[^16] – kein Game, kein App-Store-Eintrag im relevanten Bereich
- **International verständlich** in Englisch, Deutsch, Spanisch
- **Kurz, prägnant, einprägsam** – ideal für App-Store-Optimierung (ASO)

### Alternative Namen (zur Verfügung stehend, Stand Juni 2026)

| Name | Bewertung | Verfügbarkeit |
|---|---|---|
| **SpotForge** ⭐ | Stark, prägnant, thematisch perfekt | Verfügbar (nur unverwandtes CLI-Tool[^16]) |
| **CardForge** | Gut, aber Fokus fehlt auf Spotting | Prüfen |
| **ForgeSpot** | Weniger natürlich im Klang | Verfügbar |
| **SnapForge** | Verwirrung mit Snapchat möglich | Prüfen |
| **SpotCraft** | Gut, aber "Craft" wirkt nach Minecraft | Verfügbar |
| **WildForge** | Gut für Natur, schließt Autos etc. aus | Verfügbar |

***

## 15. Abgrenzung gegenüber Wettbewerb (USP-Zusammenfassung)

| USP | Begründung |
|---|---|
| **Alle Kategorien in einer App** | Kein Konkurrent deckt Autos + Tiere + Flugzeuge + Baumaschinen + Pflanzen gemeinsam ab[^1][^3][^5] |
| **Echte Trumpf-Duelle** | WildcardDex hat Battles nur im Abo[^5]; CarDex[^2] und RealDex[^7] haben keine Battles |
| **Lokale KI (Privacy-first)** | Alle Konkurrenten senden Fotos an Cloud-Server |
| **Reale Fakten als Karten-Stats** | Karten spiegeln echte Messwerte wider, keine fiktiven Werte |
| **Creator-Ownership** | Wer eine Karte spottet, ist der „Entdecker" – mit Tag auf der Karte |

***

*Dieses Dokument dient als Basis-GDD für die Weiterentwicklung durch ein Entwicklerteam oder eine KI-gestützte Implementierungsphase. Alle technischen Angaben sind als Empfehlungen zu verstehen und können je nach Ressourcen und Plattform-Anforderungen angepasst werden.*

---

## References

1. [CarDex - AI Car Spotter - Apps on Google Play](https://play.google.com/store/apps/details?id=com.studiomuench.cardex&hl=en_US) - Snap any car, let Ai turn it into a trading card and climb global leaderboards

2. [CarDex Ai - Collect Cars IRL - Apps on Google Play](https://play.google.com/store/apps/details?id=com.studiomuench.cardex&hl=en) - CarDex is a unique mobile game. Take photos of real cars to instantly turn them into trading cards. ...

3. [Skycards by Flightradar24 | The Real-World Aircraft Card Game](https://spark.mwm.ai/us/apps/skycards-by-flightradar24/6737029127) - Transform the sky into your game board. Use live Flightradar24 data to capture real aircraft overhea...

4. [Skycards by Flightradar24 - Real-Time Aircraft Card Game](https://chrome-stats.com/d/com.flightradar24.skycards) - Capture real aircraft and build your card deck with live data from Flightradar24. Battle, upgrade, a...

5. [Wildcard Dex | Wildlife ID App for iPhone & Android](https://www.wildcarddex.com) - Identify wildlife, collect species cards, earn XP, complete quests, trade with friends, and explore ...

6. [Skycards](https://skycards.app) - Capture real aircraft and build your card deck with live data from Flightradar24! Spot planes, upgra...

7. [Приложение «RealDex» — App Store](https://apps.apple.com/us/app/realdex/id6758669232?l=ru) - Загрузите приложение «RealDex» от этого разработчика (Alp Yalay) в App Store. См. скриншоты, оценки ...

8. [Car Identifier: Car Spotter (by ALEXANDRU STAN)](https://appagg.com/ios/reference/car-identifier-car-spotter-40581267.html?hl=en) - Developer: STAN I. C. ALEXANDRU PERSOANA FIZICA AUTORIZATA; Price: Free; Lists: 0 + 0; Points: 1 + 5...

9. [Car Identifier: Car Spotter - App Store - Apple](https://apps.apple.com/iq/app/car-identifier-car-spotter/id6751605515) - Download Car Identifier: Car Spotter by STAN I. C. ALEXANDRU PERSOANA FIZICA AUTORIZATA on the App S...

10. [Top Drives - Car Race Battles](https://apps.apple.com/gb/app/top-drives-car-race-battles/id1069370674) - Petrol-heads, motor-heads, turn to Top Drives, the high octane driving challenge - test your skills ...

11. [MakeACard | AI Pokemon-Style Trading Card Generator](https://make-a-card.harikp.com) - Turn any photo into a Pokemon-style trading card with AI. 5-tier rarity system, holographic effects,...

12. [AI Trading Card Maker | Free Gaming Design Tool - AI Two](https://aitwo.co/new-ai-tools/ai-trading-card-maker) - Create epic trading card maker with AI. Perfect for game developers, streamers, and gaming communiti...

13. [Ace Trumps - Wikipedia](https://en.wikipedia.org/wiki/Ace_Trumps)

14. [Trump Cards - Apps on Google Play](https://play.google.com/store/apps/details?id=com.yedesign.card_game&hl=en) - Trump Cards - Compare, Collect & Triumph!

15. [Trump Cards – Apps bei Google Play](https://play.google.com/store/apps/details?id=com.yedesign.card_game&hl=de_AT) - Trumpfkarten – Vergleichen, Sammeln & Triumphieren!

16. [SpotForge Storyboard Automation Toolkit — built with AI on B - Blink](https://blink.new/p/spotforge-storyboard-toolkit-nxiguwhn) - SpotForge is a command-line toolkit that streamlines the creation, editing, and exporting of storybo...

