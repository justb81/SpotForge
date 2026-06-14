# @spotforge/ai-engine

Kapselt die **On-Device-KI-Pipeline** (GDD §5). Nimmt ein Foto entgegen und
liefert eine fertige `Card` (aus `game-core`) zurück – komplett offline,
privacy-first.

## Pipeline

```
forgeCard(photo)
  → classifier.classify(photo)   // Kategorie + Unterkategorie + Objekt-ID
  → factLookup.find(objectId)    // reale Fakten aus der Offline-DB
  → game-core.buildCard(facts)   // Stats, Seltenheit, ggf. Spezialfähigkeit
  → cardArt.generate(card)       // Card-Art-Bild
  ⇒ Card
```

## Verträge (austauschbare Implementierungen)

- `Classifier` — YOLOv11-nano / MobileNetV4 über ONNX Runtime Mobile.
- `FactLookup` — SQLite + FTS5 (Seeds aus `data/facts`).
- `CardArtGenerator` — LCM / quantisiertes Stable Diffusion (ONNX).
- `Fallback` — unbekanntes Objekt → Community-Meldung + manuelle Kategorisierung.

Die Interfaces erlauben Modell-Updates per OTA/CDN ohne App-Release und
Mocking in Tests.

## Grenzen

Berechnet keine Spielregeln – Stats/Seltenheit kommen aus `game-core`. Lädt keine
Fotos hoch (on-device).

## Abhängigkeiten

`@spotforge/game-core`, `data/categories`. Laufzeit: ONNX Runtime Mobile, SQLite.

## Status

Gerüst – Interfaces werden als Nächstes definiert.
