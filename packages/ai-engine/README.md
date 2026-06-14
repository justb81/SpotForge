# @spotforge/ai-engine

Kapselt die **On-Device-KI-Pipeline** (GDD §5). Nimmt ein Foto entgegen und
liefert eine fertige `Card` (aus `game-core`) – komplett offline, privacy-first.

**Generisch & konfigurierbar:** Die Engine ist kategorie-neutral. Guardrails und
Prompts kommen aus der aktiven `AppDefinition` (`@spotforge/app-config`), sodass
dieselbe Engine die Auto-App, eine Tier-App usw. bedient.

## Pipeline

```
forgeCard(photo, { guardrails, prompts })
  → classifier.classify(photo)              // Kategorie + Unterkategorie + Objekt-ID
  → guardrails: in allowed? über minConfidence?  // sonst rejectMessage, keine Karte
  → factLookup.find(objectId)               // reale Fakten aus der Offline-DB (+ factPrompt)
  → game-core.buildCard(facts)              // Stats, Seltenheit, ggf. Spezialfähigkeit
  → cardArt.generate(card, cardArtPrompt)   // Card-Art-Bild
  ⇒ Card
```

## Verträge (austauschbare Implementierungen)

- `Classifier` — EfficientNet-V2-S (ImageNet) über **react-native-executorch**
  (PyTorch ExecuTorch). Fahrzeug-spezifische Modelle: eigener Export/Fine-Tune (#9).
- `FactLookup` — SQLite + FTS5 (Seeds aus `data/facts`).
- `CardArtGenerator` — On-Device-Generator (#11).
- `Fallback` — unbekanntes/abgelehntes Objekt → Guardrail-Meldung bzw.
  Community-Meldung + manuelle Kategorisierung.

## Grenzen

Keine Spielregeln (kommen aus `game-core`), keine fest verdrahtete Kategorie,
kein Foto-Upload (on-device).

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/app-config` (Guardrails/Prompts-Typen),
`data/categories`. Laufzeit: react-native-executorch, SQLite.

## Status

Gerüst. **PoC #50:** minimale Klassifikation steht – `Classifier`-Vertrag
(`classify({ imageUri }) → { label, confidence }`, entkoppelt von den
Domänentypen) plus `createClassifier(modelSource, onProgress?)` auf Basis von
EfficientNet-V2-S (ImageNet, int8) über react-native-executorch. Resize/
Normalisierung/Softmax übernimmt ExecuTorch intern; die Modell-Asset-Quelle
(gebündeltes `.pte`) reicht der App-Host durch.

> Hinweis: Ursprünglich war ONNX Runtime Mobile vorgesehen
> (`onnxruntime-react-native`), das aber die von Expo SDK 56 erzwungene React-
> Native-New-Architecture (Bridgeless) nicht unterstützt. Wechsel auf ExecuTorch;
> ADR-Aktualisierung folgt. `FactLookup`, `CardArtGenerator` und die
> `forgeCard`-Orchestrierung folgen (#8/#10/#11).
