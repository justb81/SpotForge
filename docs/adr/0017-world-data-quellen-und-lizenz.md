# ADR 0017 – World-Data-Quellen & Lizenz (Fahrzeug-Korpus)

- **Status:** Vorgeschlagen (Entwurf)
- **Datum:** 2026-06-20
- **Bezug:** ADR 0010 (Spot→Forge, World Data autoritativ beim Forgen), ADR 0009
  (Seltenheit braucht `realWorldRarity`), ADR 0002/0016 (White-Label je
  Oberkategorie, ein Fein-Modell je App), ADR 0006 (reproduzierbare,
  manifest-/hash-gepinnte Beschaffung); Issues #95 (dieses ADR), #10
  (Offline-Fakten-DB/Seeds), #76 (Server-World-Data/Forge), #72 (Objekt-ID-Raum/
  Resolver), #9 (Fein-Modell/Labelsatz)

## Kontext

#10 (Offline-Fakten-DB) und #76 (Online-Schmiede) setzen die **World Data** als
gegeben voraus: #76 liest sie server-autoritativ (Objekt-ID → Fakten), #10 baut
daraus die provisorischen Offline-Seeds. Woher dieser Grundbestand kommt und unter
welcher **Lizenz** er ins Repo bzw. in die ausgelieferte `.db` darf, war bisher in
keinem Issue erfasst.

Der Korpus muss die **trumpfbaren Attribute** aus
[`data/categories/vehicles.json`](../../data/categories/vehicles.json) abdecken –
`power` (PS), `acceleration` (0–100 km/h), `topSpeed`, `weight`, `price`, `year` –
plus eine stabile **Objekt-ID** (Marke/Modell/Generation) als Mapping-Schlüssel
(Seam zu #72). Zielschema ist `FactRecord.attributes: AttributeValues`
(`packages/game-core`), genutzt von App (provisorisch, #10) **und** Backend
(autoritativ, #76) aus *einem* Korpus.

Privacy (Goldene Regel #5) ist unkritisch (öffentliche Sachdaten); die **Lizenz**
muss aber **Bündelung + Weitergabe in der App** erlauben.

### Befund aus der Quellen-Recherche (entscheidend)

Live-Coverage gegen den Wikidata-Query-Service (Stand 2026-06-20,
`P31 = Q3231690` *automobile model*, **13.378** direkte Instanzen):

| Attribut (Ziel) | Wikidata-Property | Einträge | Coverage |
|---|---|---|---|
| `topSpeed` | P2052 (speed) | 533 | **~4 %** |
| `weight` | P2067 (mass) | 1.992 | **~15 %** |
| `year` | P571 (inception) | 779 | **~6 %** |
| `power` | (P2109 o. ä.) | 57 | **<1 %** |
| `acceleration` | – kein Standard-Property | ~0 | **~0 %** |
| Hersteller | P176 (manufacturer) | gut belegt | hoch |

**Kernbefund:** Wikidata deckt **Identität/Taxonomie** (Hersteller, Modell, Bild,
Herkunft) gut ab, die **trumpfbaren Performance-Stats** (`power`, `acceleration`,
`topSpeed`) jedoch praktisch **nicht** (≪ 5 %). Die Annahme „~50.000 voll
bestattete Fahrzeuge aus Wikidata" trägt **nicht**. Performance-Specs in breiter
Abdeckung liegen überwiegend in proprietären Spezialdatenbanken; frei und
einheitlich lizenzierte, voll bestattete Korpora sind selten.

### Ergänzende Quellen-Recherche (für die fehlenden Stats)

Eine gezielte Suche nach frei lizenzierten Quellen für die in Wikidata fehlenden
Felder ergab ein geteiltes Bild:

- **`power` + `weight` sind lösbar (CC-BY):** Das EEA-Dataset *„Monitoring of CO₂
  emissions from passenger cars"* (EU-Verordnung 2019/631) steht unter **CC-BY**
  (freie Weitergabe inkl. kommerzieller Nutzung, nur Quellennennung – **nicht**
  share-alike) und enthält für ~37 Mio. EU-Neuzulassungen (seit 2012) **Motorleistung
  (kW)** und **Masse (kg)** nebst Hersteller/Make/Modell/Jahr. Zu aggregieren von der
  Zulassungs-/Typgenehmigungsebene auf Modell/Generation. Kein `acceleration`,
  `topSpeed`, `price`.
- **`acceleration` + `topSpeed` + `price` bleiben die echte Lücke:** Keine breite,
  *permissiv* lizenzierte Quelle gefunden. Vollständige Korpora (z. B.
  vbalagovic/cars-dataset ~54k Varianten, automobile-catalog) sind **proprietär/
  kostenpflichtig**; permissive Open-Datasets (UCI Automobile, CC-BY 4.0) sind winzig
  (~205 Zeilen). **DBpedia/Wikipedia-Infoboxen** liefern diese Felder für populäre
  Modelle, aber **CC-BY-SA** (viral). Kaggle-Sammlungen geben teils CC0/CC-BY an, sind
  aber gescraped und in Herkunft/Korrektheit nicht belastbar.

## Entscheidung

**1. Zwei-Schichten-Korpus statt einer Monoquelle.** Identität und Trumpf-Stats
werden getrennt beschafft, weil ihre Coverage und Lizenzlage auseinanderfallen.

**2. Identitäts-Layer = Wikidata (CC0), optional NHTSA vPIC (US-Gov, gemeinfrei).**
- **Wikidata (CC0):** Rückgrat des **Objekt-ID-Raums** (Hersteller P176, Modell,
  `year` P571, Bild) – gemeinfrei, App-Bündelung problemlos.
- **NHTSA vPIC (Werk der US-Bundesregierung → public domain):** optionaler
  **Taxonomie-Normalisierer** für saubere Make/Model/Year-Tripel. **Keine**
  Performance-Stats, US-lastig. Die genaue Gemeinfreiheits-Klausel ist mit Quelle
  im Provenienz-Vermerk zu belegen.

**3. Stat-Layer nur für den erkennbaren Labelsatz (nicht für alle 50k).** Der
entscheidende Hebel: **Volle Trumpf-Stats werden nur für die vom Fein-Modell (#9)
tatsächlich erkennbaren Objekte gebraucht** – nicht für den gesamten
Identitäts-Korpus. Die ~50k sind FTS-/Identitätsbreite; Stat-*Vollständigkeit*
zählt nur für spottbare Objekte (Labelsatz #9 ↔ Objekt-ID-Raum #72). Der
Stat-Layer ist damit klein und hochwertig statt groß und löchrig.

Der Stat-Layer wird nach Feld-Verfügbarkeit gespeist:

- **`power` + `weight` aus EEA (CC-BY):** breite, frei lizenzierte Abdeckung über die
  EU-Zulassungsdaten (kW→PS, Aggregation auf Modell/Generation).
- **`acceleration` + `topSpeed` + `price`:** keine permissive Breitenquelle →
  **kuratiert (CC0)** für den begrenzten Labelsatz (Vorzug) oder **DBpedia/Wikipedia
  (CC-BY-SA)** maschinell, dann mit Artefakt-Kennzeichnung (siehe Leitplanke 4).
- **`year` + Identität:** Wikidata (CC0), ergänzt durch EEA.

**4. Lizenz-Leitplanke = CC0 bevorzugt; CC-BY zulässig; CC-BY-SA bewusst und
isoliert.** Bevorzugt werden gemeinfreie/CC0-Quellen. **CC-BY** (Attribution ohne
Share-Alike, z. B. EEA) ist unbedenklich bündelbar – es genügt der Quellenvermerk in
der `LICENSE`/`PROVENANCE`-Datei, ohne das Artefakt insgesamt zu „infizieren". Wo CC0
die Trumpf-Stats nicht hergibt, ist eine **kuratierte CC0-Ergänzung** der Vorzug.
**DBpedia/Wikipedia-Infoboxen (CC-BY-SA)** sind zulässig, dann aber **bewusst**:
Share-Alike ist viral und würde
das **Daten-Artefakt** (Seeds/`.db`) unter CC-BY-SA + Attribution stellen (es
infiziert die App-*Daten*, **nicht** den App-*Code*). Diese Entscheidung wird je
Datenfeld dokumentiert; CC0- und CC-BY-SA-Herkunft werden **nicht vermischt**,
ohne dass das Artefakt entsprechend gekennzeichnet ist.

**5. Reproduzierbare Beschaffung unter `tools/fetch-world-data` (Konvention wie
`tools/fetch-models`, ADR 0006).** Gepinnte SPARQL-Query/Dump-Snapshot + Manifest;
Normalisierung (kW→PS, mph→km/h, Währung→EUR) ins Seed-Format aus #10; je Datensatz
**Provenienz** (Quelle, Property, Stand, Abruf-Query). Ein `LICENSE`/`PROVENANCE`
liegt dem Daten-Artefakt bei.

## Begründung

- **Folgt der Coverage-Realität:** Eine reine CC0-Wikidata-Quelle würde die
  trumpfbaren Attribute zu < 5 % füllen – die Forge (#76) und Seltenheit (#9 →
  `realWorldRarity`) wären leer. Die Trennung Identität/Stats macht das explizit.
- **Hält die Lizenz sauber:** CC0-Rückgrat ist unzweifelhaft bündelbar; die einzige
  virale Option (CC-BY-SA) wird isoliert, kennzeichnungspflichtig und vermeidbar.
- **Skaliert mit dem Fein-Modell statt gegen es:** Stat-Vollständigkeit nur für den
  Labelsatz #9 koppelt den Aufwand an das, was die App real erkennt (ADR 0016: ein
  Fein-Modell je App), statt 50k Einträge vergeblich bestatten zu wollen.
- **Erfüllt #95 reproduzierbar:** Ein gepinntes Ingest + Provenienz/Lizenz-Vermerk
  ist zugleich Grundlage für #10 (Seeds → `.db`) und #76 (autoritative World Data).

## Konsequenzen

- **`tools/fetch-world-data` (neu):** Identitäts-Ingest (Wikidata SPARQL, gepinnt;
  optional vPIC-Normalisierung) + Stat-Layer-Merge; Einheiten-Normalisierung;
  Output im Seed-Format aus #10 mit Objekt-ID + Provenienz je Feld.
- **`data/facts/` (#10):** `schema.sql` + Seed-Format nehmen Objekt-ID,
  trumpfbare Attribute und einen **Provenienz/Lizenz-Vermerk** je Datensatz auf;
  die gebaute `.db` bleibt gitignored.
- **Objekt-ID-Raum (#72):** Slug-/Normalisierungsschema wird hier mit der
  Seed-Datenquelle festgezurrt (1:1 zum Resolver-Lookup-Key).
- **Backend (#76):** lädt denselben Korpus als autoritative, `appId`/kategorie-
  skopierte World Data (ADR 0012/0016).
- **Coverage-Report ist Pflicht-Artefakt:** Anteil Einträge mit vollständigen
  Trumpf-Stats + Lücken-Strategie (kuratierte Ergänzung vs. Ausschluss) – zugleich
  Akzeptanzkriterium von #95.
- **`CLAUDE.md`/ADR-Liste:** Eintrag 0017 ergänzen.

## MVP-Scope

CarForge: Identitäts-Layer aus Wikidata (CC0) für den Objekt-ID-Raum; `power`/`weight`
aus EEA (CC-BY); `acceleration`/`topSpeed`/`price` kuratiert (CC0 bevorzugt) **nur**
für den Labelsatz des ersten Fein-Modells (#9). Breite Identitätsabdeckung (FTS) +
schmale, vollständige Trumpf-Stats genügen für Spot (Draft-Vorbefüllung, #10) und
Forge (#76).

## Offene Punkte / Folgeentscheidungen

- Endgültige Wahl der Stat-Quelle für `acceleration`/`topSpeed`/`price`: kuratiert-CC0
  vs. DBpedia/Infoboxen (CC-BY-SA, mit Artefakt-Kennzeichnung). `power`/`weight` sind
  über EEA (CC-BY) abgedeckt.
- EEA-Aggregation: Mapping der Zulassungs-/Typgenehmigungszeilen auf Modell/Generation
  (Dedup, kW→PS) und Verknüpfung mit dem Objekt-ID-Raum (#72).
- vPIC ja/nein für MVP (US-Lastigkeit vs. Normalisierungsnutzen).

## Alternativen

- **Reine Wikidata-CC0-Monoquelle.** Verworfen: Trumpf-Stats < 5 % Coverage – die
  Forge/Seltenheit hätten keine Datenbasis.
- **Proprietäre Spezial-Korpora** (z. B. vbalagovic/cars-dataset, automobile-catalog)
  mit vollständigen Stats. Verworfen: kostenpflichtig/nicht weitergebbar – mit der
  Bündelung in der App (Lizenz-Leitplanke) unvereinbar.
- **DBpedia/Wikipedia (CC-BY-SA) als Hauptquelle.** Verworfen als *Default*: mehr
  Specs, aber virales Share-Alike auf dem gesamten Daten-Artefakt; nur als bewusste,
  gekennzeichnete Stat-Layer-Option zulässig.
- **Voll bestatteter 50k-Korpus.** Verworfen: weder frei lizenziert verfügbar noch
  nötig – Stat-Vollständigkeit zählt nur für den erkennbaren Labelsatz.
