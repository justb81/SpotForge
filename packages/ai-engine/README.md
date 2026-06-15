# @spotforge/ai-engine

Kapselt die **On-Device-KI-Pipeline** (GDD §5). Nimmt ein Foto entgegen und
liefert eine fertige `Card` (aus `game-core`) – komplett offline, privacy-first.

**Generisch & konfigurierbar:** Die Engine ist kategorie-neutral. Guardrails und
Prompts kommen aus der aktiven `AppDefinition` (`@spotforge/app-config`), sodass
dieselbe Engine die Auto-App, eine Tier-App usw. bedient.

## Pipeline

```
forgeCard(photo, { guardrails, prompts })
  → classifier.classify(photo)              // rohe Label-Kandidaten { label, confidence, candidates } (#9, domänenfrei)
  → Label → Kategorie/Unterkategorie/Objekt-ID  // Domänen-Mapping in forgeCard (#8)
  → guardrails: in allowed? über minConfidence?  // sonst rejectMessage, keine Karte
  → factLookup.find(objectId)               // reale Fakten aus der Offline-DB (+ factPrompt)
  → game-core.buildCard(facts)              // Stats, Seltenheit, ggf. Spezialfähigkeit
  → cardArt.generate(card, cardArtPrompt)   // Card-Art-Bild
  ⇒ Card
```

## Verträge (austauschbare Implementierungen)

- `Classifier` — über **react-native-executorch** (PyTorch ExecuTorch).
  `createClassifier` lädt entweder das eingebaute ImageNet-Basismodell
  (`kind: "imagenet-efficientnet-v2-s"`, PoC #50) **oder** ein eigen-exportiertes
  Modell mit mitgeliefertem Label-Satz (`kind: "custom"`, #9). Liefert Top-k-
  Kandidaten (`ClassificationResult.candidates`).
- `FactLookup` — SQLite + FTS5 (Seeds aus `data/facts`).
- `CardArtGenerator` — On-Device-Generator (#11).
- `Fallback` — unbekanntes/abgelehntes Objekt → Guardrail-Meldung bzw.
  Community-Meldung + manuelle Kategorisierung.

## Zwei-Stufen-Kaskade (`cascade.ts`)

- `createCascadeClassifier({ gate, gateConfig, initFine })` — ein breites
  **Gate** klärt „gehört das in den Scope?" (z.B. „ist das ein Fahrzeug?"); erst
  bei Annahme wird das schwere **Feinmodell** (Marke+Modell) ausgeführt. Beide
  Modelle sind **fest gebündelt**; `initFine` initialisiert das Feinmodell nur
  **bei Bedarf** in den Speicher (aus dem Bundle, kein Netz).
- `evaluateGate(result, { allow, minConfidence })` — Allowlist + Schwelle;
  lehnt Nicht-Scope-Objekte ab (Guardrail vor dem teuren Schritt).
- Kategorie-neutral: die Allowlist kommt aus der `AppDefinition` (verdrahtet in
  `forgeCard` #8) — hier steht keine fest kodierte Kategorie.
- **Ein generisches Gate für ganz SpotForge (White-Label):** dasselbe breite
  Modell (ImageNet) ist das Gate für **alle** Apps; jede App liefert nur ihre
  Allowlist (Auto-App → Fahrzeug-Synsets, Tier-App → Tier-Synsets).

## Modell-Manifest (`models/`)

- `parseManifest` — typisierte, streng validierte Sicht auf das Modell-Manifest
  (Schema v3). Reine Logik, ohne RN-Import → unter vitest testbar.

Modelle werden per `tools/export-model` exportiert, als GitHub-Release-Asset
gehostet und vor dem Build via `tools/fetch-models` **fest ins APK gebündelt** (je
Variante; kein Nachladen/OTA, siehe
[ADR 0008](../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md)).

## Grenzen

Keine Spielregeln (kommen aus `game-core`), keine fest verdrahtete Kategorie,
kein Foto-Upload (on-device).

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/app-config` (Guardrails/Prompts-Typen),
`data/categories`. Laufzeit: react-native-executorch, SQLite.

## Status

**Klassifikation + Modell-Bündelung (#9):** `Classifier`-Vertrag
(`classify({ imageUri }) → { label, confidence, candidates }`, Top-k, entkoppelt
von den Domänentypen) plus `createClassifier(model, options?)` für eingebautes
ImageNet-Basismodell **und** eigene Modelle (`fromCustomModel` mit Label-Satz +
Normalisierung). Dazu die Zwei-Stufen-Kaskade und der Manifest-Parser (`models/`);
Modelle werden fest gebündelt (kein OTA).

Offen: `FactLookup`, `CardArtGenerator` und die `forgeCard`-Orchestrierung
(#8/#10/#11). Produktionsreifes Fahrzeugmodell + Geräte-Verifikation sind
Mensch-/Geräte-Aufgaben (#9, siehe [ADR 0008]).

> Hinweis: Ursprünglich war ONNX Runtime Mobile vorgesehen
> (`onnxruntime-react-native`), das aber die von Expo SDK 56 erzwungene React-
> Native-New-Architecture (Bridgeless) nicht unterstützt → Wechsel auf
> ExecuTorch ([ADR 0007]).

[ADR 0007]: ../../docs/adr/0007-on-device-inference-executorch.md
[ADR 0008]: ../../docs/adr/0008-modell-export-pipeline-und-lifecycle.md
