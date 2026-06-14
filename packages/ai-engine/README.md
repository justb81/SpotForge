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

- `Classifier` — YOLOv11-nano / MobileNetV4 über ONNX Runtime Mobile.
- `FactLookup` — SQLite + FTS5 (Seeds aus `data/facts`).
- `CardArtGenerator` — LCM / quantisiertes Stable Diffusion (ONNX).
- `Fallback` — unbekanntes/abgelehntes Objekt → Guardrail-Meldung bzw.
  Community-Meldung + manuelle Kategorisierung.

## Grenzen

Keine Spielregeln (kommen aus `game-core`), keine fest verdrahtete Kategorie,
kein Foto-Upload (on-device).

## Abhängigkeiten

`@spotforge/game-core`, `@spotforge/app-config` (Guardrails/Prompts-Typen),
`data/categories`. Laufzeit: ONNX Runtime Mobile, SQLite.

## Status

Gerüst – Interfaces werden als Nächstes definiert.
