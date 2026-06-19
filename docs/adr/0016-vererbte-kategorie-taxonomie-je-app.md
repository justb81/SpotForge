# ADR 0016 – Vererbte Kategorie-Taxonomie innerhalb der White-Label-Apps

- **Status:** Vorgeschlagen (Entwurf) – **verfeinert** [ADR 0002](./0002-multi-app-single-codebase.md)
  (White-Label bleibt; je Oberkategorie eine App), ohne es abzulösen
- **Datum:** 2026-06-19
- **Bezug:** ADR 0002 (White-Label/Multi-Tenancy, bekräftigt), ADR 0004 (Distribution,
  bleibt offen), ADR 0008 (ein Fein-Modell je Variante, bekräftigt), ADR 0009
  (Seltenheit), ADR 0010 (Spot→Forge), ADR 0011 (Branding-Deep-Merge), ADR 0012
  (DB/RLS/Multi-Tenant, bekräftigt), ADR 0014 (fp32/Embedding)

## Kontext

ADR 0002 legt fest: **White-Label**, je Kategorie eine eigene App, ein
mandantenfähiger Server (`appId` = Tenant); Start nur CarForge. ADR 0012 erzwingt
die Mandantentrennung DB-seitig (RLS).

Aus der Diskussion über die Erkennungs-Pipeline entstand zwischenzeitlich der
Gedanke, das White-Label **ganz aufzugeben** und alles in *einer* Single-Tenant-App
mit globaler Sammelgebiets-Taxonomie zu bündeln. Das wird **verworfen** – es
vermischte zwei unabhängige Fragen:

1. **Wie schneiden wir Apps/Mandanten?** → je **Oberkategorie** eine App (ADR 0002).
2. **Wie strukturieren wir Kategorien *innerhalb* einer App?** → das ist offen und
   der eigentliche Gegenstand dieses ADR.

Die wertvolle Idee des verworfenen Ansatzes – eine **Kategorie-Taxonomie mit
Vererbung** (natürlich hierarchisch, WordNet-/ImageNet-verankert) – ist **orthogonal**
zum App-Modell und soll erhalten bleiben, aber **innerhalb** jeder App.

## Entscheidung

**1. White-Label je Oberkategorie bleibt (ADR 0002 bekräftigt).** Je Oberkategorie
eine eigene App aus der gemeinsamen Codebase via `APP_VARIANT`:

- **CarForge** – Fahrzeuge jeder Art
- **PlantForge** – Pflanzen
- **AnimalForge** – Tiere

Eine App = eine `AppDefinition` = ein Mandant (`appId`). Start unverändert: nur
**CarForge** (MVP); die anderen folgen als eigene Vertikalen.

**2. Innerhalb jeder App: Kategorie-Taxonomie mit Vererbung.** Die Oberkategorie der
App ist die **Wurzel** eines Kategorie-Baums; Unterkategorien **erben** von ihren
Vorfahren per **Deep-Merge**:

- **Attribut-Schema** (trumpffähige/informative Merkmale),
- **Gate/Guardrails** (was die KI als „im Scope" akzeptiert),
- **Texte** und **Card-Branding**.

Mechanik identisch zu `resolveBranding` (ADR 0011), nur entlang der **Kategorie-
Ahnenkette** statt `variant ← _default`. Die `CategoryDefinition`
(`packages/game-core`, `data/categories/`) bekommt dafür ein **`parent`** und nimmt
die heute in `AppDefinition.category` liegenden Gate/Guardrails **auf Knoten-Ebene**
auf. `AppDefinition.category.primary` zeigt auf die **Wurzel-Kategorie** der App.

**3. Der attribut-tragende Knoten ist die Battle-Ebene.** Ein erkanntes Blatt läuft
im Baum hoch bis zum nächsten Knoten mit Attribut-Schema – das ist die Battle-
Kategorie der Karte. Battles nur dort (Attribute homogen). Fehlt ein feineres
Schema, greift **graceful degradation** auf eine Vorfahren-Karte (Foto + Kategorie),
statt das Objekt abzulehnen.

**4. Ein Fein-Klassifizierer-Modell je App.** Pro App genau **ein** gebündeltes
Fein-Modell (ADR 0008 unverändert: ein Modell je Variante ins APK gebündelt, kein
OTA), das den **app-eigenen** Taxonomie-Teilbaum bedient. Pipeline:

```
universeller Gate → Routing in den app-eigenen Teilbaum → app-eigenes Fein-Modell
```

**Kein** Modell pro Unterkategorie. Ein Detektor-Gate (z. B. permissiv lizenzierter
COCO-Detektor mit bbox→Crop) ist je App optional.

**5. Multi-Tenant bleibt (ADR 0012 unverändert).** Apps sind im Backend per `appId`
getrennt (RLS/`withTenant`). Sammlung, Tausch und Duelle sind **mandanten-intern**
(kein app-übergreifender Tausch). Der Netzwerk-Effekt wirkt pro App-Pool – konsistent
mit dem ursprünglichen White-Label-Rationale (ADR 0002/0004).

## Begründung

- **Trennt zwei Achsen sauber:** „Mandanten-/App-Schnitt" (Oberkategorie) vs.
  „Kategorie-Struktur innerhalb der App" (Taxonomie). Der frühere Entwurf koppelte
  beides aneinander und opferte dadurch unnötig die White-Label-Vorteile.
- **Behält die Stärken von ADR 0002/0012:** schärfere ASO/UA je App, eigene
  Store-Identität, **DB-erzwungene** Mandantentrennung.
- **Holt die echte Verbesserung des verworfenen Ansatzes:** Unterkategorien mit
  vererbten Attributen + graceful degradation auf Vorfahren-Karten, ohne
  Datenduplikation und ohne kategorie-spezifischen Code (Goldene Regel #1).
- **Ein Fein-Modell je App** hält ADR 0008 (Bündelung, kein Nachladen) unverändert
  gültig – kein Multi-Modell-OTA nötig.

## Konsequenzen

- **`@spotforge/app-config`:** Die `AppDefinition` behält App-/Mandant-Identität; die
  **Kategorie-Spezifika** (`category.guardrails`, `category.gate`, Texte, Card-
  Branding) wandern in den **Kategorie-Baum** und werden je Knoten vererbt.
  `category.primary` = Wurzel-Kategorie der App.
- **`@spotforge/game-core`:** `CategoryDefinition` bekommt `parent`; ein Vererbungs-
  Resolver (Deep-Merge entlang der Ahnenkette). `validate-categories` um Baum-
  Integrität erweitern (azyklisch, `parent` existiert, ≥ 1 attribut-tragender
  Vorfahre erreichbar). game-core bleibt rein.
- **`@spotforge/ai-engine`:** Gate → Routing in den app-eigenen Teilbaum → ein
  app-eigenes Fein-Modell; Detektor-Gate optional je App. Berührt ADR 0014: wird vor
  der Fein-/Embedding-Stufe gecroppt, wird die Crop-Geometrie Teil der Embedding-
  Identität (bbox am Draft persistieren, kanonischer fp32/CPU-Pfad).
- **`variants/`** bleibt (je Oberkategorie ein Bündel + EAS-Profil). Der ADR-0002-
  Workflow „neue App = neue Variante" gilt unverändert; **neu:** die Variante bringt
  ihren **Kategorie-Teilbaum** (`data/categories/`) mit.
- **Backend/Tenancy (ADR 0012):** unverändert multi-tenant per `appId`. Seltenheit
  (ADR 0009): Dichte-Schlüssel pro App/Kategorie unverändert.
- **`CLAUDE.md`:** Produktmodell bleibt White-Label; ergänzen um „intra-App-Kategorie-
  Taxonomie mit Vererbung". ADR-Liste-Eintrag 0016 anpassen.
- **Cross-Refs:** ADR 0002 erhält einen **Verfeinerungs-Verweis** (analog ADR 0011);
  ADR 0004 bleibt **offen** (aktuelle Tendenz: separate Apps je Oberkategorie).

## MVP-Scope

- **CarForge** als einzige App. Kategorie-Baum „Fahrzeuge" mit Wurzel `vehicle` und
  einigen Unterkategorien (z. B. `car`, `motorcycle`, `truck`), die Attribute, Texte
  und Branding erben – validiert Taxonomie, Vererbung und graceful degradation früh,
  ohne den Datenaufwand zu vervielfachen. **Ein** Fein-Modell (Jordo23). PlantForge/
  AnimalForge folgen als eigene Vertikalen.

## Offene Punkte / Folgeentscheidungen

- Granularität der Battle-Ebene je App (Game-Design).
- Endgültige Wurzel-/Knoten-Auswahl aus WordNet je App.
- Datenquellen je Unterkategorie (begrenzt das Tempo, mit dem Knoten hinzukommen).

## Alternativen

- **Eine Single-Tenant-App mit globaler Taxonomie** (früherer Entwurf). Verworfen:
  vermischt App-Schnitt und Kategorie-Struktur, opfert White-Label-Vorteile und die
  DB-erzwungene Mandantentrennung; der einzige Mehrwert (app-übergreifender Tausch)
  ist nicht gewünscht.
- **Taxonomie je App, aber ein Fein-Modell pro Unterkategorie.** Verworfen: mehrere
  gebündelte Modelle je App kollidieren mit ADR 0008 (Bündelgröße, kein OTA).
- **Flache Kategorien je App (ohne Vererbung).** Verworfen: verliert Attribut-
  Vererbung und graceful degradation; die Hierarchie ist günstig, weil WordNet sie
  ohnehin liefert.
