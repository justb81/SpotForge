# ADR 0004 – Distributionsstrategie: separate Apps vs. eine App mit Kategorie-Lobby

- **Status:** Offen – Entscheidung bewusst vertagt auf Vertikale #2;
  **Entscheidung vorgeschlagen** in [ADR 0016](./0016-eine-app-taxonomie-sammelgebiete.md)
  (Entwurf: zugunsten *einer* App)
- **Datum:** 2026-06-14
- **Bezug:** ADR 0002 (White-Label, mandantenfähiger Server)

## Kontext

ADR 0002 legt fest, dass jede Kategorie **eine eigene App** ist (White-Label aus einer
Codebase). Es kam die Marketing-/Verbreitungsfrage auf, ob das die richtige
Distributionsform ist – oder ob **eine einzige App mit Kategorie-Auswahl (Lobby)** für
Marketing und Wachstum besser wäre. Die Architektur erlaubt **beides** aus derselben
Codebase (generischer `app-shell`, `appId`-skopiertes Backend), daher ist die Entscheidung
reversibel.

## Entscheidung

1. **MVP unverändert: nur CarForge.** Die Frage „separate Apps vs. Lobby" wird erst bei
   der Aufnahme der **zweiten Vertikale** relevant.
2. **Entscheidung wird datengetrieben getroffen** – erst messen, *was* Retention treibt
   (Sammeln, Tauschen, Duellieren), dann festlegen.
3. **Aktuelle Tendenz: eine App mit Lobby** (bzw. mindestens geteilter Account-/Tausch-
   Layer), primär wegen des **Netzwerk-Effekts** des Genres.
4. **Separate Apps nur als Ausnahme** für Vertikalen mit eigener, monetarisierbarer
   Community **und** Lizenz-/Partner-Hebel.
5. **Architektur bleibt offen halten:** Keine Festlegung im Code, die eine der beiden
   Formen verbaut.

## Begründung

- **Netzwerk-Effekt ist der entscheidende Faktor.** Tausch und Trumpf-Duelle brauchen
  Liquidität im selben Spielerpool. Separate Apps zersplittern den Social-Graph (App-A-
  Nutzer kann nicht mit App-B-Nutzer tauschen/duellieren) und untergraben so den viralen
  Kern. Eine App (oder geteiltes Trading-Backend) erhält ihn.
- **Marketing-Ökonomie:** N separate Apps = N× Store-Listings, Reviews-from-zero, UA-
  Kampagnen, Credentials. Für ein kleines/kostenbewusstes Team teuer. Eine App bündelt
  Funnel und Bewertungs-Pool.
- **Gegenargumente (pro separate Apps):** schärfere Nischen-ASO, zielgruppengenaue UA,
  stärkere Nutzeridentität, isoliertes Risiko, vermarktbare Einzel-Vertikalen. Diese
  überwiegen nur, wenn der Wert in der Nischen-*Identität* statt im *Tausch-Netzwerk* liegt.

## Konsequenzen

- `game-core`/`app-shell` bleiben generisch; eine Lobby-App wäre „eine Variante, die
  mehrere Kategorien lädt" – kein Architektur-Bruch.
- Der mandantenfähige Server hält **app-übergreifenden Tausch/Duell** als „später
  zuschaltbar" offen (GDD) – das ist der Mittelweg, falls doch separate Apps kommen.
- **Vor der Entscheidung zu erhebende Signale:** Retention-Treiber (Solo vs. sozial),
  Tausch-/Duell-Frequenz, organische vs. bezahlte Akquise-Kosten je Nische, Nachfrage
  nach weiteren Kategorien bei bestehenden Nutzern.
- Diese ADR wird bei Vertikale #2 zu „Akzeptiert" mit konkreter Wahl aktualisiert (oder
  durch eine Folge-ADR ersetzt).
