# @spotforge/ai-engine

Kapselt die **On-Device-Spot-Pipeline** (GDD §5.1). Nimmt ein Foto entgegen und
liefert einen **Draft** (`Card` mit Status `draft`, aus `game-core`) – komplett
offline, privacy-first. Reale Stats und Seltenheit kommen autoritativ aus der
**Online-Schmiede** (Server, §5.4 / [ADR 0010]); die Engine *forged* nicht.

**Generisch & konfigurierbar:** Die Engine ist kategorie-neutral. Guardrails und
Prompts kommen aus der aktiven `AppDefinition` (`@spotforge/app-config`), sodass
dieselbe Engine die Auto-App, eine Tier-App usw. bedient.

## Pipeline

```
spot(photo, { gate, guardrails })
  → cascade.classify(photo)                 // Gate „ist es ein Fahrzeug?" → Feinmodell Marke/Modell (#9)
  → Gate-Guardrail: in gate.allow? über minConfidence?  // sonst rejectMessage (inkl. erkannter Klasse), kein Draft
  → resolve(label) → Objekt-ID              // LabelResolver; trivialer Default hier, produktiv #72
  → factLookup.find(objectId)?              // optionale, PROVISORISCHE Offline-Vorschläge (#10) – nicht autoritativ
  → game-core.buildDraft(...)               // Draft-Karte: Foto + erkanntes Objekt, Status „draft", Platzhalter-Rarity
  ⇒ DraftCard | rejected(message) | unrecognized

// Autoritative Stats + Seltenheit + Status „forged": Online-Schmiede (Server), nicht hier (ADR 0010).
```

## Verträge (austauschbare Implementierungen)

- `Classifier` — über **react-native-executorch** (PyTorch ExecuTorch).
  `createClassifier` lädt ein **eigen-exportiertes** Modell (`fromCustomModel`)
  mit mitgeliefertem Label-Satz + Normalisierung – sowohl das breite fp32-Gate
  (EfficientNet-B0/ImageNet, #83) als auch das fahrzeug-spezifische Feinmodell
  (#9). Liefert Top-k-Kandidaten (`ClassificationResult.candidates`).
- `FactLookup` — SQLite + FTS5 (Seeds aus `data/facts`); liefert nur
  **provisorische** Offline-Vorschläge für den Draft, **nicht** die autoritativen
  Werte (die kommen beim Forgen vom Server, #10 / [ADR 0010]).
- `LabelResolver` — Label → Objekt-ID; trivialer Default in #8, produktiv in #72.
- `CardArtGenerator` — On-Device-Generator (#11), beim/nach dem Forgen.
- `Fallback` — abgelehntes Objekt → `rejectMessage`; unbekanntes → `unrecognized`
  (Melde-/Freigabe-Flow in UI/Backend, nicht in der Engine).

## Zwei-Stufen-Kaskade (`cascade.ts`)

- `createCascadeClassifier({ gate, gateConfig, initFine })` — ein breites
  **Gate** klärt „gehört das in den Scope?" (z.B. „ist das ein Fahrzeug?"); erst
  bei Annahme wird das schwere **Feinmodell** (Marke+Modell) ausgeführt. Beide
  Modelle sind **fest gebündelt**; `initFine` initialisiert das Feinmodell nur
  **bei Bedarf** in den Speicher (aus dem Bundle, kein Netz).
- `evaluateGate(result, { allow, minConfidence })` — schwellt die **summierte**
  Wahrscheinlichkeitsmasse über **alle** erlaubten Synsets (marginale
  `P(im Scope)`, #83), nicht den besten Einzelkandidaten: ein Objekt verteilt
  seine Masse oft über mehrere Synsets, die einzeln unter der Schwelle lägen.
  `matched` (bester erlaubter Kandidat) bleibt für die Reject-Meldung erhalten.
  Das Gate wird mit erhöhtem `topK` (`GATE_TOP_K`) gebaut, damit verteilte Masse
  überhaupt erfasst wird; die Schwelle ist bewusst **recall-lastig** (ein
  False-Negative killt einen legitimen Spot).
- Kategorie-neutral: die Allowlist kommt aus der `AppDefinition` (`category.gate.allow`,
  verdrahtet in `spot` #8) — hier steht keine fest kodierte Kategorie.
- **Stufen-Latenzen (`CascadeTimings`, #63):** jedes `CascadeResult` (und damit
  jedes `SpotResult`) trägt die gemessenen Laufzeiten — `gateMs`, optional
  `fineMs`/`fineInitMs` (Accept-Pfad, Kaltstart separat), `totalMs`. Die Uhr ist
  injizierbar (`now`, Default monoton). `formatCascadeTimings` rendert eine
  kompakte On-Screen-Zeile für die Geräte-Verifikation (kein Profiler im
  Standalone-Release). Protokoll + Budgets:
  [`docs/verification/ai-cascade-device-verification.md`](../../docs/verification/ai-cascade-device-verification.md).
- **Gate-Masse (`SpotResult.gateMass`, #85):** jedes `SpotResult` führt die
  summierte Gate-Masse (`P(im Scope)`) dieses Schusses mit — unabhängig von der
  Annahme-Entscheidung. Der **Auto-Spot** (app-shell) nutzt sie als single-frame-
  Signal für seine eigene, **strengere** `autoFireMinConfidence`: die Pipeline darf
  bei der manuellen Schwelle akzeptieren, der getaktete Auto-Modus „feuert" aber
  erst über der Auto-Schwelle.
- **Ein generisches Gate für ganz SpotForge (White-Label):** dasselbe breite
  fp32-Modell (EfficientNet-B0/ImageNet) ist das Gate für **alle** Apps; jede App
  liefert nur ihre Allowlist (Auto-App → Fahrzeug-Synsets, Tier-App → Tier-Synsets).

## Modell-Manifest (`models/`)

- `parseManifest` — typisierte, streng validierte Sicht auf das Modell-Manifest
  (Schema v3). Reine Logik, ohne RN-Import → unter vitest testbar.

Modelle werden per `tools/export-model` exportiert, als GitHub-Release-Asset
gehostet und vor dem Build via `tools/fetch-models` **fest ins APK gebündelt** (je
Variante; kein Nachladen/OTA, siehe
[ADR 0008](../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md)).

## Foto-Sanitisierung vor Upload (`sanitize.ts`, #89)

Karten-Fotos verlassen das Gerät zwangsläufig (Sync #19, Schmiede #76/#81, PvP
#20, Tausch #21) und werden anderen Spielern gezeigt. **Bevor** ein Foto hochgeht,
bereinigt `createPhotoSanitizer(config, deps)` es on-device:

```
sanitize(photo)
  → detectors[kind].detect(photo)          // je aktivem Blur-Ziel (face, licensePlate) – normalisierte Boxen
  → processor.process({ blurRegions, encode })  // ALLE Metadaten strippen + blurren + re-enkodieren
  → harte Vorbedingung: metadataStripped === true?  // sonst SanitizationError – KEIN Rohbild-Upload
  ⇒ { imageUri, report }                   // bereinigtes Bild + Nachweis (was wurde geblurrt/gestrippt)
```

- **EXIF/GPS werden immer entfernt** (kein Schalter – Privacy-first, Goldene
  Regel 5); der `processor` re-enkodiert das Bild metadatenfrei.
- **Kategorie-neutral (Goldene Regel 1/3):** *welche* Ziele geblurrt werden, kommt
  aus `resolveSanitization(AppDefinition)` (`@spotforge/app-config`) — Gesichter
  per Default, Kfz-Kennzeichen nur bei Varianten mit Fahrzeugbezug (CarForge). Kein
  hartkodiertes „Kennzeichen" hier.
- **Harte Vorbedingung:** fehlt ein nötiger Detektor, schlägt die Detektion fehl
  oder bestätigt der Prozessor das Stripping nicht → `SanitizationError`. Der
  Upload-Pfad blockt dann, statt das Rohbild zu senden.
- `RegionDetector` und `ImageProcessor` sind **injizierte Seams** wie `Classifier`:
  die native Implementierung (ExecuTorch-Detektion, `expo-image-manipulator` + Blur)
  lebt im RN-Host (Synergie mit dem Detektor aus #75); die Orchestrierung hier ist
  rein und vitest-getestet (`sanitize.test.ts`).

> **Modelle:** Die Gesichts-/Kennzeichen-Detektionsmodelle werden – wie Gate/Fein –
> per `tools/export-model` exportiert und per `tools/fetch-models` gebündelt (eigene
> Manifest-Einträge, kein Git-Asset). Der Export der konkreten Detektor-Modelle ist
> eine Geräte-/Modell-Aufgabe und folgt separat (vgl. #75).

## Grenzen

Keine Spielregeln (kommen aus `game-core`), keine fest verdrahtete Kategorie. Der
eigentliche Foto-**Upload** (Netz/Storage) liegt im Client/Backend (#81/#19); diese
Engine liefert nur die verpflichtende On-Device-Sanitisierung davor (#89).

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/app-config` (Guardrails/Prompts-Typen),
`data/categories`. Laufzeit: react-native-executorch, SQLite.

## Status

**Klassifikation + Modell-Bündelung (#9):** `Classifier`-Vertrag
(`classify({ imageUri }) → { label, confidence, candidates }`, Top-k, entkoppelt
von den Domänentypen) plus `createClassifier(model, options?)` für eigen-exportierte
Modelle (`fromCustomModel` mit Label-Satz + Normalisierung). Dazu die
Zwei-Stufen-Kaskade mit summierter-Masse-Gate-Logik (#83) und der Manifest-Parser
(`models/`); Modelle werden fest gebündelt (kein OTA).

Implementiert: die `spot`-Orchestrierung (#8) – Gate-Guardrail aus der
`AppDefinition` (`category.gate.allow` + `minConfidence`), trivialer
Default-`LabelResolver` (`slugLabelResolver`), Reject- und `unrecognized`-Pfad sowie
`game-core.buildDraft` → Draft. Dazu die **Foto-Sanitisierung** (#89,
`sanitize.ts`): generische Orchestrierung (Strip/Blur/Re-Enkodierung als harte
Vorbedingung) mit injizierten Detektor-/Prozessor-Seams; die nativen
Implementierungen und der Export der Detektor-Modelle folgen geräteseitig (#75).
Offen: produktive `FactLookup`-Impl (#10),
`CardArtGenerator` (#11) und der produktive Resolver (#72). Das **Forgen** (World
Data + autoritative Seltenheit) ist server-seitig ([ADR 0010]), nicht in dieser
Engine. Produktionsreifes Fahrzeugmodell + Geräte-Verifikation sind Mensch-/Geräte-
Aufgaben (#9, siehe [ADR 0008]).

> Hinweis: Ursprünglich war ONNX Runtime Mobile vorgesehen
> (`onnxruntime-react-native`), das aber die von Expo SDK 56 erzwungene React-
> Native-New-Architecture (Bridgeless) nicht unterstützt → Wechsel auf
> ExecuTorch ([ADR 0007]).

[ADR 0007]: ../../docs/adr/0007-on-device-inference-executorch.md
[ADR 0008]: ../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md
[ADR 0010]: ../../docs/adr/0010-online-schmiede-und-draft-lebenszyklus.md
