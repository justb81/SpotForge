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
  `createClassifier` lädt entweder das eingebaute ImageNet-Basismodell
  (`kind: "imagenet-efficientnet-v2-s"`, PoC #50) **oder** ein eigen-exportiertes
  Modell mit mitgeliefertem Label-Satz (`kind: "custom"`, #9). Liefert Top-k-
  Kandidaten (`ClassificationResult.candidates`).
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
- `evaluateGate(result, { allow, minConfidence })` — Allowlist + Schwelle;
  lehnt Nicht-Scope-Objekte ab (Guardrail vor dem teuren Schritt).
- Kategorie-neutral: die Allowlist kommt aus der `AppDefinition` (`category.gate.allow`,
  verdrahtet in `spot` #8) — hier steht keine fest kodierte Kategorie.
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

Implementiert: die `spot`-Orchestrierung (#8) – Gate-Guardrail aus der
`AppDefinition` (`category.gate.allow` + `minConfidence`), trivialer
Default-`LabelResolver` (`slugLabelResolver`), Reject- und `unrecognized`-Pfad sowie
`game-core.buildDraft` → Draft. Offen: produktive `FactLookup`-Impl (#10),
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
