# ADR 0010 – Online-Schmiede & Draft-Lebenszyklus (Spot offline → Forge online)

- **Status:** Akzeptiert
- **Datum:** 2026-06-15
- **Bezug:** GDD §3, §5.1/§5.4, §10.4; ADR 0002 (White-Label/Multi-Tenancy),
  ADR 0009 (Spotting-Dichte/Seltenheit); Issues #8, #10, #15, #19. Schließt das
  in ADR 0009 als offen markierte **Draft/Forge-Flow-Design** ab.

## Kontext

Das ursprüngliche GDD beschrieb den Forge-Vorgang als **rein on-device**: die
lokale KI erkennt das Objekt, zieht die Fakten aus einer **Offline-SQLite-DB**
(#10) und erzeugt die fertige Karte inkl. Seltenheit. Daraus folgte ein
`forgeCard`-Pipeline-Schnitt (#8), der Klassifikation, Fakten-Lookup, Karten-Bau
und Seltenheit lokal verkettet.

Bei der Durcharbeitung des Spielflusses fielen mehrere Probleme auf:

- **Autoritative Daten & Anti-Cheat.** Reale Stats und Seltenheit müssen
  server-autoritativ sein (PvP-Fairness, Anti-Farming – vgl. ADR 0009). Eine rein
  lokale Berechnung ist manipulierbar und nicht mandantenweit konsistent.
- **World Data ist groß und lebendig.** Eine vollständige, gepflegte Faktenbasis
  pro Kategorie lässt sich nicht sinnvoll komplett ins APK bündeln; sie lebt
  server-seitig und wächst.
- **Neue/unbekannte Objekte brauchen Kuratierung.** Vom Spieler vorgeschlagene
  Daten dürfen nicht ungeprüft in den Kanon; es braucht einen Freigabeprozess.
- **Offline-First bleibt ein Versprechen.** Das Spotten muss ohne Netz funktionieren.

## Entscheidung

Der Loop wird in zwei klar getrennte Phasen geschnitten:

**1. Spot (on-device, offline) → Draft.**
   `ai-engine` führt nur die **Klassifikation** aus (Zwei-Stufen-Kaskade,
   ADR 0008): Gate (Kategorie/„ist es ein Fahrzeug?") → bei Treffer Feinmodell
   (Marke/Modell). Ergebnis ist eine **Draft-Karte** (Status `draft`) mit dem
   aufgenommenen Foto und dem erkannten Objekt. Der Spieler kann **bestätigen,
   korrigieren** oder **eigene Attributwerte vorschlagen**. Kein Netz nötig.

**2. Forge (online, server-autoritativ) → forged.**
   Der Spieler reicht Draft(s) – einzeln oder als **Bulk** – beim Server ein. Der
   Server ermittelt die Attribute aus der zentralen **World Data** (mandanten-
   skopiert, ADR 0002), berechnet die **Seltenheit** autoritativ (ADR 0009) und
   setzt den Status auf `forged`. Unbekannte Objekte und abweichende Spieler-
   Vorschläge laufen durch einen **Freigabe-/Kuratierungsprozess**, bevor sie Teil
   der World Data werden.

**Begleitende Festlegungen:**

- **Karten-Lebenszyklus** im `game-core`-Domänenmodell: `Card.status` mit
  `draft → forged` (Erweiterung des `Card`-Typs); ein Draft trägt eine Foto-URI
  und optionale Spieler-Vorschläge. Client und Server teilen denselben Typ.
- **Seltenheit ist bis zum Forgen ein Platzhalter** auf dem Client; der Server ist
  die einzige Wahrheit (deckt sich mit ADR 0009).
- **#10 (Offline-Fakten-DB) wird neu gefasst:** liefert nur **provisorische
  Vorschläge** für den Draft und die Offline-Anzeige – **nicht** die autoritativen
  Werte. Die Autorität liegt bei der Online-Schmiede.
- **Privacy bleibt gewahrt:** Eingereicht werden **Draft-Metadaten**, nicht das
  Foto (Opt-in, §10.4).
- **Foto-Ausschnitt:** Der Draft speichert vorerst das **aufgenommene Foto**; ein
  automatischer Zuschnitt auf das erkannte Objekt (Objekt-Detection/Bounding-Box)
  ist ein späteres, eigenes Thema.

## Konsequenzen

- **#8** wird auf die **On-Device-Spot-Pipeline** (Gate → Draft) zugeschnitten;
  Fakten-Lookup, Seltenheit und Karten-Finalisierung wandern in die Online-Schmiede.
- **Neue Backend-Arbeit:** Online-Schmiede (World-Data-Lookup, autoritative
  Attribute + Seltenheit, Bulk-Einreichung) und ein **Freigabe-/Kuratierungs-
  prozess** (eigene Issues).
- **game-core** erhält den Karten-Lebenszyklus (`status`, Draft-Felder).
- **Offline-Garantie verschiebt sich** sauberer: garantiert offline ist das
  **Spotten/Draften**, nicht das Forgen.
- **GDD** §3/§5/§10.4 werden entsprechend neu gefasst.

## Alternativen

- **Forge komplett on-device (Status quo ante).** Verworfen: nicht
  server-autoritativ, World Data nicht bündelbar, keine Kuratierung möglich.
- **Forge komplett online, ohne lokale Vorschläge (#10 entfällt).** Verworfen:
  schwächt das Offline-Erlebnis beim Draften unnötig; provisorische Offline-
  Vorschläge sind billig und nützlich.
