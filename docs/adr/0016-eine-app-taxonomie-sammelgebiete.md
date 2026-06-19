# ADR 0016 – Eine App „SpotForge" mit Taxonomie der Sammelgebiete

- **Status:** Vorgeschlagen (Entwurf) – soll [ADR 0002](./0002-multi-app-single-codebase.md)
  **ablösen** und die offene [ADR 0004](./0004-distributionsstrategie-apps-vs-lobby.md)
  zu „eine App" **entscheiden**
- **Datum:** 2026-06-19
- **Bezug:** ADR 0002 (White-Label/Multi-Tenancy, abgelöst), ADR 0004 (Distribution),
  ADR 0008 (Modell-Bündelung), ADR 0009 (Seltenheit), ADR 0010 (Spot→Forge),
  ADR 0011 (Branding-Deep-Merge), ADR 0012 (DB/RLS), ADR 0014 (fp32/Embedding)

## Kontext

ADR 0002 legte das Produktmodell als **White-Label** fest: jede Kategorie ist eine
**eigene App** (Auto-App, Tier-App, …), zur **Build-Zeit** über `APP_VARIANT`
erzeugt, bedient von einem **mandantenfähigen Server** (`appId` = Tenant). ADR 0004
ließ die Distributionsfrage „separate Apps vs. eine App mit Lobby" **bewusst offen**,
notierte aber bereits eine **Tendenz zu einer App wegen des Netzwerk-Effekts**.

Zwei Beobachtungen verschieben die Abwägung:

1. **Top-Trumps lebt vom Netzwerk-Effekt.** Tausch und Duelle brauchen Liquidität im
   *selben* Spielerpool. Separate Apps zersplittern den Social-Graph (Auto-App-Nutzer
   kann nicht mit Tier-App-Nutzer tauschen/duellieren) und untergraben den viralen
   Kern – genau die Sorge aus ADR 0004.
2. **Karten-Kategorien sind natürlich hierarchisch** – `sports car → car → vehicle`,
   `zebra → mammal → animal` – und decken sich mit **WordNet**, dessen Blätter die
   **ImageNet-Labels** sind, also exakt das Vokabular unseres Gate-Modells (ADR 0008,
   `CategoryGate.allow`). Die Taxonomie der Sammelgebiete ist damit nicht willkürlich,
   sondern aus dem Modell-Ontologie ableitbar.

Daraus ergibt sich ein anderes Produktmodell: **eine App, in der man beliebige Objekte
spottet**, sofern das Modell sie erkennt **und** sie einem **kuratierten Sammelgebiet**
zugeordnet werden können.

## Entscheidung

**1. Eine App „SpotForge".** Kein Build-Zeit-White-Label pro Kategorie mehr; kein
`APP_VARIANT`-Schalter, ein einziges App-Build. Die App-Identität (Name, neutrales
Branding, Wurzelmenge der Sammelgebiete) ist *eine* App-Config, nicht viele.

**2. Sammelgebiete als Taxonomie.** Kategorien werden ein **Baum** (vorläufiger Name
**„Sammelgebiet"**, Philatelie-Begriff – Endname offen). Der Baum ist eine
**kuratierte WordNet-Projektion** über den ImageNet-Leaves; das Repo pinnt, *welche*
Knoten Sammelgebiete mit eigenem Attribut-Set sind und welche reine Anzeige-Vorfahren
bleiben. **`data/categories/` wird die Heimat** dieser Taxonomie.

**3. `CategoryDefinition` trägt Hierarchie + Konfiguration.** Die heutige
`CategoryDefinition` (`packages/game-core`, Attribut-Schema in `data/categories/*.json`)
bekommt ein **`parent`** und übernimmt das **Funktionale, das heute in der
`AppDefinition` steckt** (`category.guardrails`, `category.gate`, Text-Overrides,
Card-Branding). **Vererbung per Deep-Merge entlang des Baums** – dieselbe Mechanik wie
`resolveBranding` (ADR 0011), nur über die Kategorie-Ahnenkette statt `variant ← _default`.

**4. Der attribut-tragende Knoten ist die „Battle-Ebene".** Ein erkanntes Blatt-Label
**läuft im Baum hoch bis zum nächsten Knoten, der ein Attribut-Schema deklariert** –
das ist die **Battle-Kategorie** der Karte. **Battles nur dort** (Attribute homogen,
vergleichbar). Anzeige/Theme/Texte werden von dort bis zur Wurzel vererbt. Die
Granularität (z. B. „Super-Cars" vs. „Straßenwagen") ist eine Game-Design-Stellschraube.

**5. Erkennung verallgemeinert sich – heutige Cascade ist ein Spezialfall.**

```
heute:    Gate(ImageNet) → Fein(Jordo23, nur Fahrzeuge)
künftig:  Gate(ImageNet) → Routing in die Taxonomie → optionales gebietsspezifisches Fein-Modell
```

Der **Gate wird als Interface** geführt, pro Sammelgebiet wählbar:
- **Classifier-Gate** (generisch, ImageNet-Synset-Masse, ADR 0008/`evaluateGate`) –
  Default; deckt dank ImageNet-Ontologie auch Tiere breit ab.
- **Detektor-Gate** (gebiets-*lokal*, z. B. permissiv lizenzierter COCO-Detektor für
  Fahrzeuge) – liefert zusätzlich **Bounding-Box → Crop** für höhere Fein-Genauigkeit.
  Bewusst kein generischer Default: COCO deckt Fahrzeuge gut, Tiere nur grob und
  Pflanzen gar nicht ab.

**6. Karten-Identität (MVP): Foto + erkannte Kategorie.** Reale Fakten als Stats gibt
es **nur, wo ein Attribut-Schema + Datenquelle existieren**. Fehlt das nächste
Fein-Gebiet, greift **graceful degradation**: eine generische Vorfahren-Karte
(„Säugetier", Foto + Kategorie) statt harter Ablehnung. „Alles spotten" heißt also
präzise: *alles, was ein kuratiertes Sammelgebiet trifft*.

**7. Sammeln/Tausch kategorieübergreifend, Battles innerhalb der Battle-Kategorie.**
Die Sammlung filtert schnell nach Sammelgebiet (+ Favoriten). Tausch ist
gebietsagnostisch; Matchmaking/Queues für Duelle sind pro Battle-Kategorie.

**8. Single-Tenant.** Eine App = ein Produkt = ein Spielerpool. Die **Kategorie wird
eine Spalte** auf der Karte, **kein Tenant-Boundary**. Die `appId`-basierte
**RLS/`withTenant`-Schicht (ADR 0012) entfällt im Request-Pfad**; sie kann für ein
mögliches späteres echtes B2B-White-Label dormant bleiben (Folgeentscheidung).

**9. Neutrales App-Styling, Karten-Branding pro Sammelgebiet.** Das App-Chrome nutzt
das neutrale `_default`-Theme; pro Sammelgebiet getöntes **Karten**-Branding wird per
Deep-Merge entlang des Baums aufgelöst (ADR 0011 + prozeduraler SVG-Rahmen ADR 0015
bleiben die Mechanik).

**10. MVP-Scope: Fahrzeuge + ein Test-Gebiet.**
- **Fahrzeuge** voll ausgebaut (Classifier- oder Detektor-Gate, Jordo23-Fein-Modell,
  Attribut-Schema `vehicles.json` mit Datenquelle).
- **Ein datenarmes Test-Gebiet** (z. B. „Säugetiere") nur mit **Gate-Label + Foto,
  ohne eigenes Fein-Modell** – um Taxonomie, Routing, Vererbung, Filter und
  kategorieübergreifenden Tausch früh zu validieren, ohne den Datenaufwand zu
  vervielfachen.

## Begründung

- **Netzwerk-Effekt** (ADR-0004-Argumente): ein Spielerpool erhält Tausch-/Duell-
  Liquidität und den viralen Kern; ein Marketing-Funnel statt N Store-Listings.
- **WordNet/ImageNet-Verankerung:** Die Taxonomie ist ableitbar und selbst-konsistent
  mit dem Modell-Vokabular; der bestehende Synset-basierte Gate generalisiert direkt
  zum „in welches Sammelgebiet fällt die Masse?".
- **Weniger Sonderfall:** Die Zwei-Stufen-Cascade wird zum allgemeinen
  „Gate → Routing → optionales Fein-Modell", statt fahrzeug-spezifisch zu sein.
- **Single-Tenant passt zum Modell:** kategorieübergreifender Tausch/Sammlung
  *widerspricht* einer Mandanten-Partition nach Kategorie; Single-Tenant entfernt
  Komplexität, die ursprünglich für getrennte White-Label-Kunden gedacht war.
- **Datenaufwand bleibt gleich, komponiert aber besser:** jedes attribut-tragende
  Gebiet braucht – wie heute jede Variante – Schema + Datenquelle; neu ist nur, dass
  sie in *einem* Produkt und einer Vererbungs-Hierarchie koexistieren.

## Konsequenzen

- **`@spotforge/app-config`:** `AppDefinition` (viele) → **eine** App-Config +
  **`CategoryDefinition`-Baum** mit `parent`; `defineApp`/`defineBranding` →
  `defineCategory` (+ Card-Branding pro Gebiet); der Loader **walkt den Baum** und
  merged Gate/Guardrails/Texte/Branding entlang der Ahnenkette.
- **`variants/`** (Build-Zeit-Bündel, `APP_VARIANT`, EAS-Profile pro Variante)
  **entfällt** → ein Build, ein EAS-Profil. `variants/_default` bleibt als neutrale
  Branding-Basis sinngemäß erhalten (App-Theme).
- **`data/categories/`** wird die **zentrale Taxonomie** inkl. `parent`, `gate`,
  `guardrails`, Card-Branding, Texten; `validate-categories` um Baum-Integrität
  erweitern (azyklisch, `parent` existiert, ≥ 1 attribut-tragender Vorfahre erreichbar).
- **`@spotforge/ai-engine`:** Gate-**Routing** in die Taxonomie; **Gate-als-Interface**
  (Classifier/Detektor); Fein-Modell **pro Gebiet optional**. Berührt ADR 0014:
  Wird im Detektor-Gate **vor** der Fein-/Embedding-Stufe **gecroppt**, wird die
  Crop-Geometrie Teil der Embedding-Identität → bbox am Draft persistieren, Embedding
  auf kanonischem fp32/CPU-Pfad mit derselben Box rechnen.
- **`game-core`** bleibt rein; Trumpf-Engine unverändert; **Battle-Matchmaking pro
  Battle-Kategorie**.
- **Seltenheit (ADR 0009):** Der Dichte-Schlüssel ist bereits kategorie-spezifisch →
  passt; Schlüssel = Battle-/Sammelgebiet.
- **Modell-Bündelung (ADR 0008):** Im MVP unkritisch (Gate-Label-Karten brauchen kein
  Fein-Modell). **Mehrere Fein-Modelle** je Gebiet erzwingen später eine Neubewertung
  der „kein OTA"-Festlegung → **eigenes Folge-ADR**.
- **Server/Tenancy (ADR 0012):** **Single-Tenant**; RLS/`withTenant` entfällt im
  Request-Pfad; Kategorie als Spalte/Index. Garage (ADR 0013) unberührt. Endgültige
  Entfernung vs. Dormant-Halten der RLS-Schicht ist eine Folgeentscheidung.
- **`CLAUDE.md`:** „Goldene Regeln" und der Produktmodell-Absatz (White-Label) müssen
  überarbeitet werden (eine App + Sammelgebiete); Backlog/Tracking-Issue #27 anpassen.
- **Statuswechsel:** Bei Akzeptanz wird **ADR 0002 → „Abgelöst durch ADR 0016"** und
  **ADR 0004 → „Entschieden: eine App (durch ADR 0016)"**.

## Offene Punkte / Folgeentscheidungen

- **Battle-Balance & Anti-Stacking** über heterogene Gebiete; Granularität der
  Battle-Ebene (Game-Design).
- **Modell-OTA**, sobald viele Fein-Modelle gebündelt würden (Folge-ADR zu ADR 0008).
- **RLS-Schicht** endgültig entfernen oder dormant halten (Folge zu ADR 0012).
- **Endgültiger Name** für „Sammelgebiet".
- **Datenquellen-Strategie** pro künftigem Gebiet (begrenzt die Geschwindigkeit, mit
  der Gebiete hinzukommen).

## Alternativen

- **White-Label beibehalten (ADR 0002).** Verworfen: zersplittert den Netzwerk-Effekt,
  N× Store-/Marketing-Overhead.
- **Eine App mit *flacher* Kategorie-Lobby (ohne Hierarchie/Vererbung).** Verworfen:
  verliert Config-Vererbung und graceful degradation; die Hierarchie ist günstig, weil
  WordNet sie ohnehin liefert.
- **Tenant = Kategorie beibehalten.** Verworfen: kollidiert mit kategorieübergreifendem
  Tausch und gemeinsamer Sammlung.
