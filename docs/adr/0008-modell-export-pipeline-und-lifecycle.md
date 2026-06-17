# ADR 0008 – Modell-Export-Pipeline & Versionierung (fest gebündelt je Variante)

- **Status:** Akzeptiert
- **Datum:** 2026-06-14
- **Bezug:** ADR 0007 (On-Device-Inferenz/ExecuTorch), GDD §5.2/§10.3; Issue #9

## Kontext

Der PoC (#50) liefert mit dem gebündelten **ImageNet-EfficientNet** nur grobe
Klassen. Für CarForge brauchen wir eine **modell-genaue Fahrzeug-Erkennung**
(Marke + Modell) als Grundlage für reale Stats (#10) plus einen Weg, das Modell
**reproduzierbar herzustellen**.

**Festlegung:** Jede Variante bündelt ihr(e) Modell(e) **fest ins APK**. Es gibt
**kein Nachladen und kein OTA** der Modelle – nichts wird zur Laufzeit
heruntergeladen oder aktualisiert. Ein neues Modell heißt: neuer Export, neues
Manifest, neuer App-Build. Das hält den Offline-/Privacy-Betrieb trivial garantiert
und vermeidet Lifecycle-Komplexität (Versions-/Kompatibilitätsmatrix, Teil-Updates).

Offene Punkte waren: Wie entsteht das `.pte` reproduzierbar? Wo wird es gehostet
(Binary nicht im Git)? Wie werden Modell-Artefakte versioniert und integritäts-
gesichert ins Bundle gezogen?

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

3. **Manifest-Schema v3** (`tools/fetch-models/models.manifest.json`). Pro Modell:
   `id`, `version` (semver), `category`, `preprocessor` und `artifacts` (Modell +
   optional Labels, je mit `url`, `dest`, `sha256`, `bytes`). `fetch-models` zieht
   **alle** Einträge vor dem Build ins Bundle und verifiziert die SHA-256. Kein
   `distribution`/`compat`/`runtime` mehr – es gibt nur den gebündelten Weg.

4. **Fest gebündelt je Variante – kein Lifecycle.** Es gibt **kein**
   OTA-/Download-Modul. Die für eine Variante vorgesehenen Modelle werden vor dem
   Build via `fetch-models` bezogen und als Metro-Asset in das APK gebündelt. Ein
   Modellwechsel ist ein **App-Build**, kein Laufzeit-Vorgang.

5. **Zwei-Stufen-Kaskade (`packages/ai-engine/cascade.ts`).** Ein günstiges,
   **breites Gate-Modell** klärt zuerst „gehört das in den Scope?" (für CarForge:
   „ist das ein Fahrzeug?") und lehnt Nicht-Scope-Objekte ab; erst bei Annahme
   wird das schwere **Feinmodell** (Marke+Modell) ausgeführt. **Beide Modelle sind
   fest gebündelt**; das Feinmodell wird lediglich **bei Bedarf in den Speicher
   initialisiert** (aus dem gebündelten Asset, kein Netz), erst beim ersten
   akzeptierten Gate.
   - **Ein generisches Gate für ganz SpotForge (White-Label).** Dasselbe breite
     Modell (ImageNet) dient als Gate für **alle** Apps; jede App liefert über
     ihre `AppDefinition` nur ihre **Allowlist** (Auto-App → Fahrzeug-Synsets,
     spätere Tier-App → Tier-Synsets). So bleibt der ai-engine-Code
     kategorie-neutral und das Gate-Modell wird einmal gepflegt/gebündelt.
   - Bewusst ein *breites* Modell statt eines schmalen Fahrzeugtyp-Modells: nur
     ein breites Modell kann Nicht-Fahrzeuge zuverlässig ablehnen (ein
     Typ-Modell ohne Negativ-Klasse würde z.B. eine Katze als „Auto" einstufen).
   - **Gate-Identität & -Logik (#83): EfficientNet-B0, ImageNet-1k, fp32.** Weil
     das Backbone klein ist, wird das Gate **unquantisiert (fp32)** exportiert –
     null Quantisierungsverlust, XNNPACKs schneller nativer Pfad (~0,4 GFLOPs),
     und mit ~19–21 MB **kleiner** als das frühere V2-S-int8-Gate (22,9 MB).
     Primärziel ist ein **minimaler Gate-False-Negative-Anteil** (ein Auto darf
     nicht als Nicht-Fahrzeug abgelehnt werden). Die Asymmetrie – ein
     durchgerutschtes Nicht-Auto fängt das Feinmodell/der `unrecognized`-Pfad
     billig ab, ein abgelehntes Auto killt einen legitimen Spot – trimmt die
     Logik bewusst **recall-lastig**: `evaluateGate` schwellt die **summierte**
     Masse über **alle** erlaubten Synsets (marginale `P(im Scope)`) bei
     erhöhtem `topK` (`GATE_TOP_K`), nicht den besten Einzelkandidaten. Das Gate
     ist ein **eigen-exportiertes `custom`-Modell** (`tools/export-model`,
     `quantize: "none"`, kanonische ImageNet-1k-Labels) – das frühere eingebaute
     V2-S-Modell (`fromModelName`) gibt es nicht mehr. Schwelle/Backbone werden
     off-device kalibriert (`tools/export-model/prescreen.py`, Vehicle-Recall)
     und auf dem Gerät verifiziert (#63).
   - Das Gate ist eine eigene, separat versionierbare Modell-Stufe (eigener
     Manifest-Eintrag); die Verkettung (Gate-Allowlist aus der `AppDefinition`)
     übernimmt `forgeCard` (#8).

## Begründung

- **Reproduzierbarkeit:** Quelle + Config + Pipeline ergeben deterministisch das
  ausgelieferte Artefakt; SHA-256 sichert Integrität an jeder Stelle.
- **Keine Zusatz-Infra:** GitHub Releases existieren bereits als Bezugsquelle für
  den Build-Schritt; kein eigener CDN/Bucket nötig.
- **Privacy/Offline trivial garantiert:** Da nichts zur Laufzeit lädt, gibt es
  keinen Netzpfad und keine Update-Logik, die den Offline-Betrieb gefährden könnte.
- **Generisch (White-Label):** Export-Pipeline und Manifest sind kategorie-neutral;
  eine neue App liefert nur eine andere Export-Config + Manifest-Einträge und
  bündelt ihre eigenen Modelle.

## Konsequenzen

- `tools/fetch-models` und sein Manifest sind auf Schema v3 (nur gebündelt)
  umgestellt; der generische Gate-Eintrag ist das fp32-EfficientNet-B0 (#83), das
  den V2-S-int8-Eintrag **ersetzt** (kein Parallelbetrieb).
- `createClassifier` lädt **ausschließlich** eigen-exportierte Modelle
  (`fromCustomModel` mit mitgeliefertem Label-Satz + Normalisierung) und liefert
  Top-k-Kandidaten – für Gate **und** Feinmodell. Das eingebaute V2-S-Modell
  (`fromModelName`) ist entfernt.
- **Feinmodell CarForge:** `Jordo23/vehicle-classifier` (EfficientNet-B4, 8.949
  Klassen „Make Model Year", VMMRdb, MIT) – fertig, kein Training. Export über
  das `timm`-Backend; **fest ins CarForge-APK gebündelt**. **Präzision: fp32**
  (`quantize: "none"`) – wie das Gate der gewählte Baseline-Ansatz; ~134 MB,
  zusammen mit dem Gate ~155 MB (für ein Mobile-Game vertretbar, kein
  Quantisierungsverlust). **int8 ist eine optionale spätere Optimierung (#62)**,
  falls die Größe gedrückt werden soll – erst der Genauigkeitsverlust ggü. fp32 ist
  zu evaluieren (und der PT2E-Export-Pfad auf die gepinnte torch-Version zu heben).
- **Mensch-/Geräte-Aufgaben (nicht agent-automatisierbar, als Folge-Issues von
  #9):** VMMRdb-Provenienz rechtlich gegenchecken (#61), **optional** int8 als
  Größen-Optimierung evaluieren (#62), Verifikation von Erkennungsqualität, Inferenz-Latenz und
  Bundle-Budget **auf echtem Gerät** (#63 – Protokoll, Budgets und Messwert-Template
  in [`docs/verification/ai-cascade-device-verification.md`](../verification/ai-cascade-device-verification.md);
  die Kaskade misst die Stufen-Latenzen selbst und der PoC zeigt sie on-screen an).
  Die konkrete Gate-Allowlist + Verkettung der Kaskade gehört in `forgeCard` (#8).
- `classificationHint` (AppDefinition) wirkt auf ein Fix-Label-Modell nicht
  (keine Freitext-Steuerung möglich); seine Einbindung gehört in die
  `forgeCard`-Orchestrierung (#8) und ist dort zu lösen.
