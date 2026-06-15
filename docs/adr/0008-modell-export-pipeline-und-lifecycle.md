# ADR 0008 – Modell-Export-Pipeline, Versionierung & OTA-Lifecycle

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0007 (On-Device-Inferenz/ExecuTorch), GDD §5.2/§10.3; Issue #9

## Kontext

Der PoC (#50) liefert mit dem gebündelten **ImageNet-EfficientNet** nur grobe
Klassen. Für CarForge brauchen wir eine **modell-genaue Fahrzeug-Erkennung**
(Marke + Modell) als Grundlage für reale Stats (#10), plus einen Weg, das Modell
**reproduzierbar herzustellen** und **nach Release zu aktualisieren**, ohne ein
App-Update.

Offene Punkte waren: Wie entsteht das `.pte` reproduzierbar? Wo wird es gehostet
(Binary nicht im Git)? Wie werden Modelle versioniert und kompatibel gehalten?
Wie kommen Updates aufs Gerät, ohne den Offline-Betrieb zu gefährden?

## Entscheidung

1. **Export-Pipeline (`tools/export-model`).** Ein Python-Tool exportiert ein
   **fertiges** HuggingFace-Modell nach `.pte` (`torch.export → XNNPACK`) – zwei
   Backends: `optimum` (transformers via `optimum-executorch`) und `timm`
   (Checkpoint `.pth` direkt gelowert). **Kein eigenes Training.** Eine
   Export-Config (`models/<id>.json`) fixiert Quellmodell + Revision; Labels und
   Normalisierung reisen **mit dem Modell** (gleiche Version). Läuft in CI
   (`model-export.yml`), nicht im Mobile-Bundle.

2. **Hosting via GitHub Release.** Das `.pte` (und `labels.json`) wird als
   **Release-Asset** dieses Repos veröffentlicht – reproduzierbar, ohne
   Zusatz-Infra. Das Modell-Manifest referenziert es per URL + SHA-256. Binaries
   bleiben aus dem Git (`data/models/*` ignoriert).

3. **Manifest-Schema v2** (`tools/fetch-models/models.manifest.json`). Pro Modell:
   `id`, `version` (semver), `distribution` (`bundled` | `ota`), `category`,
   `runtime`, `compat.appMin`, `preprocessor` und `artifacts` (Modell + optional
   Labels, je mit `sha256`). `bundled` lädt `fetch-models` vor dem Build; `ota`
   bezieht der Lifecycle zur Laufzeit.

4. **OTA-Lifecycle (`packages/ai-engine/models`).** Reine, testbare Logik
   (Versionsvergleich, Kompatibilität, Update-Auswahl, SHA-verifizierter
   Download mit injizierter I/O). Das gebündelte Modell bleibt der
   **Offline-Fallback** und wird nicht entfernt; ein OTA-Update schaltet erst
   nach erfolgreicher Verifikation um.

5. **Zwei-Stufen-Kaskade (`packages/ai-engine/cascade.ts`).** Ein günstiges,
   **breites Gate-Modell** klärt zuerst „gehört das in den Scope?" (für CarForge:
   „ist das ein Fahrzeug?") und lehnt Nicht-Scope-Objekte ab; erst bei Annahme
   wird das schwere **Feinmodell** (Marke+Modell) **lazy** geladen.
   - **Ein generisches Gate für ganz SpotForge (White-Label).** Dasselbe breite
     Modell (ImageNet) dient als Gate für **alle** Apps; jede App liefert über
     ihre `AppDefinition` nur ihre **Allowlist** (Auto-App → Fahrzeug-Synsets,
     spätere Tier-App → Tier-Synsets). So bleibt der ai-engine-Code
     kategorie-neutral und das Gate-Modell wird einmal gepflegt/gebündelt.
   - Bewusst ein *breites* Modell statt eines schmalen Fahrzeugtyp-Modells: nur
     ein breites Modell kann Nicht-Fahrzeuge zuverlässig ablehnen (ein
     Typ-Modell ohne Negativ-Klasse würde z.B. eine Katze als „Auto" einstufen).
   - Das Gate ist eine eigene, separat versionier-/OTA-bare Stufe; die
     Verkettung (Gate-Allowlist aus der `AppDefinition`) übernimmt `forgeCard`
     (#8).

## Begründung

- **Reproduzierbarkeit:** Quelle + Config + Pipeline ergeben deterministisch das
  ausgelieferte Artefakt; SHA-256 sichert Integrität an jeder Stelle.
- **Keine Zusatz-Infra:** GitHub Releases existieren bereits; kein eigener
  CDN/Bucket nötig, um zu starten. Ein Wechsel auf CDN/HF ist später nur eine
  URL-Änderung im Manifest.
- **Privacy/Offline bleiben gewahrt:** Bündeln ist der Default-Fallback; OTA ist
  additiv und verifiziert.
- **Generisch (White-Label):** Pipeline und Lifecycle sind kategorie-neutral;
  eine neue App liefert nur eine andere Export-Config + Manifest-Einträge.

## Konsequenzen

- `tools/fetch-models` und sein Manifest sind auf Schema v2 umgestellt; der
  PoC-EfficientNet-Eintrag ist migriert (`distribution: "bundled"`).
- `createClassifier` unterscheidet eingebautes ImageNet-Basismodell
  (`fromModelName`) und eigene Modelle (`fromCustomModel` mit Label-Satz +
  Normalisierung) und liefert Top-k-Kandidaten.
- **Feinmodell CarForge:** `Jordo23/vehicle-classifier` (EfficientNet-B4, 8.949
  Klassen „Make Model Year", VMMRdb, MIT) – fertig, kein Training. Export über
  das `timm`-Backend; als `ota`-Modell ausgeliefert.
- **Mensch-/Geräte-Aufgaben (nicht agent-automatisierbar, bleiben in #9 offen):**
  VMMRdb-Provenienz rechtlich gegenchecken, int8-Kalibrierung mit echten Bildern,
  Verifikation von Erkennungsqualität und Inferenz-Latenz **auf echtem Gerät**,
  finales Größen-/Performance-Budget, sowie die konkrete Gate-Allowlist +
  Verkettung in `forgeCard` (#8).
- `classificationHint` (AppDefinition) wirkt auf ein Fix-Label-Modell nicht
  (keine Freitext-Steuerung möglich); seine Einbindung gehört in die
  `forgeCard`-Orchestrierung (#8) und ist dort zu lösen.
