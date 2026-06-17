# ADR 0014 – On-Device-Inferenz-Präzision: fp32 einheitlich + GPU/CPU-Abgrenzung für den Embedding-Tap

- **Status:** Akzeptiert
- **Datum:** 2026-06-17
- **Bezug:** ADR 0007 (On-Device-Inferenz/ExecuTorch), ADR 0008 (Modell-Export &
  Lifecycle); Issues #88 (Embedding-Flywheel), #62 (int8 – verworfen), #63
  (Geräte-Verifikation)

## Kontext

ADR 0007 nannte GPU-/NPU-Delegates (Vulkan/QNN, Core ML/MPS) als „spätere
Optimierung" neben dem portablen CPU-Pfad (XNNPACK). ADR 0008 fixierte die beiden
gebündelten Modelle (Gate EfficientNet-B0, Feinmodell EfficientNet-B4) bereits auf
**fp32**, ließ int8 aber als „optionale spätere Größen-Optimierung (#62)" daneben
stehen.

**#88 macht das on-device berechnete Embedding zum Fundament des Daten-Flywheels:**
Der Feature-Vektor (vor dem Klassifikationskopf) fällt beim Spotten gratis ab,
wird hochgeladen, und der Server fittet darauf zentral den Kopf. Das trägt nur,
wenn **alle Geräte für dasselbe Foto denselben Vektor liefern**. Die numerische
Identität eines Embeddings ist aber nicht durch die Gewichte allein definiert,
sondern durch das Tupel:

```
(Gewichte × Preprocessing × Execution-Backend × Präzision)
```

Zwei Effekte gefährden die Korpus-Kompatibilität:

1. **Präzision (fp32 vs int8) — der große Effekt.** Eine quantisierte Schicht
   liefert einen *systematisch* verschobenen Vektor, nicht nur Rauschen. Das
   bricht sowohl den Linear-Kopf-Fit (Train/Serve-Skew) als auch den
   Embedding-Cluster-/Anomalie-Detektor (#88, Punkt 4).
2. **Backend-Kernel (XNNPACK vs Vulkan vs Core ML/MPS vs QNN) — der kleine, aber
   unkontrollierte Effekt.** Float-Reduktionen sind nicht assoziativ; verschiedene
   Delegates (und fremde GPU-Treiber) ergeben Drift, die sich über die Gerätebasis
   nicht garantieren lässt — bei Attention-Backbones (ViT/DINOv2) unangenehmer als
   bei CNNs.

Verschärfend: Die Retention-Politik des Korpus (#88 / #26) minimiert nach
Konsens-Lock den **Foto**-Anspruch; bleibt nur Embedding + Label. Sobald das Foto
gelöscht ist, kann das Embedding **nie neu berechnet** werden. Ein
Präzisions-/Backend-Mismatch ist damit **irreversibel** — genau wie ein
Backbone-Versionssprung den Korpus invalidiert. Diese Entscheidung muss daher
**vor** dem Daten-Sprint stehen, nicht danach.

Eine Größen-Not, die int8 rechtfertigen würde, besteht nicht: Die
Geräte-Verifikation (#63) hat die fp32-Kaskade (~155 MB Modelle, APK ~200 MB) als
tragfähig bestätigt.

## Entscheidung

1. **fp32 ist die einheitliche Präzision des Erkennungs-/Embedding-Pfades** — Gate,
   Feinmodell und ein künftiger Embedding-Backbone (#88). **Keine Quantisierung
   (kein int8), projektweit, ohne „später"-Pfad.** Der Export erzeugt
   ausschließlich fp32 (`tools/export-model`).
2. **Der Embedding-Tap wird auf einem kanonischen, deterministischen Pfad
   berechnet: fp32 auf CPU (XNNPACK).** Backend + Präzision sind Teil der
   Embedding-Versions-Identität — zusätzlich zu `backbone_version` und
   Preprocessing-Version (Pflichtfelder am Draft/Korpus, #88).
3. **GPU/NPU-Delegates bleiben frei nutzbar — aber nur für Inferenz, die den
   Embedding-Korpus NICHT speist** (z.B. eine reine Gate-Entscheidung, sofern je
   separat ausgeführt, Live-Preview, künftige Nicht-Korpus-Modelle). Da der
   Spotting-Classifier den Embedding-Tap enthält, läuft er auf dem kanonischen
   fp32/CPU-Pfad. Wollte man den Tap je auf GPU/int8 verschieben, ist das wie ein
   **`backbone_version`-Sprung** zu behandeln (paralleler Korpus, eigenes
   Eval-Gate) — **nie stillschweigend in denselben Topf**.

## Embedding-Berechnung: Spot-UX vs. Forge-Pass

Aus Punkt 2/3 folgt, **wann** und **auf welchem Pfad** der Embedding-Tap rechnet.
Spotting und Embedding werden entkoppelt:

- **Spotting** ist hochfrequent + latenzkritisch (Kamera → sofortige Rückmeldung).
  Es **darf GPU/NPU nutzen** — der Latenz-Hebel liegt am compute-gebundenen
  **Feinmodell** (B4 ~4,2 GFLOPs); das **Gate** (B0 ~0,4 GFLOPs) ist
  preprocessing-gebunden (#63: ~200–400 ms Bilddekodierung/Resize) und profitiert
  nicht.
- **Das Embedding** wird **nur für geforgte + (Training-)opt-in Karten** benötigt
  (#88). Es wird **lazy beim Forgen, kurz vor dem Upload**, aus dem am Draft
  gespeicherten Foto (ADR 0010) berechnet. Vorteile: verworfene Drafts kosten
  keinen Embedding-Pass; ohne Opt-in entfällt er ganz (DSGVO-Zweckbindung, #26).

**Kanonische Regel (degradiert sauber):** Das Embedding stammt **immer** aus einem
fp32/CPU-Pass.

- Lief der Spot-Pass bereits fp32/CPU (CPU-only-Gerät), wird sein Tap
  **wiederverwendet** → **ein** Backbone-Pass.
- Lief der Spot-Pass auf GPU, wird beim Forgen ein fp32/CPU-Pass **nachgezogen** →
  **zwei** Pässe (der bewusste Trade: schnellere Spots gegen etwas mehr Arbeit beim
  selteneren, ohnehin online + latenztoleranten Forgen).

Eine numerische GPU-/CPU-Drift im **Spot-Argmax** ist unkritisch: das Korpus-Label
ist das vom User im Draft-Editor **bestätigte** (#88), nicht das rohe Spot-Ergebnis.

**Der GPU-Spot-Pfad selbst ist eine gemessene Optimierung, kein Tagesgeschäft:**
erst bauen, wenn die fp32/CPU-Baseline auf dem Referenz-Mid-Range-Android (#63) als
zu langsam **gemessen** ist — die Delegate-Reife (Vulkan/QNN für B4/ViT) ist das
offene Risiko (ADR 0007). Die obige Regel verankert die Architektur unabhängig
davon, ob/wann der GPU-Pfad kommt.

## Begründung

- **fp32 eliminiert den größten Divergenz-Treiber** (Quantisierungs-Verschiebung)
  und hat null Quantisierungsverlust gegenüber dem Quellmodell (#63).
- **CPU/XNNPACK ist der portabelste, homogenste Pfad** über die heterogene
  Android-Gerätebasis — reproduzierbarer als beliebige Vendor-GPU-Treiber.
- **Kein Bundle-Druck:** fp32 ist auf echten Geräten verifiziert tragfähig (#63);
  Größe ist ein akzeptierter Trade-off, kein Blocker.
- **Irreversibilität:** Gelöschte Fotos machen Embeddings unwiederbringlich → ein
  einheitlicher Pfad muss von Anfang an stehen.
- **Einfachheit:** ein Export-Pfad, kein Kalibrierdatensatz, kein PT2E-API-Drift
  gegen die gepinnte torch-Version.

## Konsequenzen

- **int8 ist verworfen, nicht zurückgestellt.** Der `quantize`-Schalter und der
  PT2E-/int8-Pfad sind aus `tools/export-model` (`export.py`, `smoke-export.py`)
  und aus allen Export-Configs entfernt; der Export ist immer fp32. **Issue #62
  (int8-Größen-Optimierung) wird als überholt geschlossen.**
- **ADR 0007** wird präzisiert: GPU/NPU-Delegates gelten nur für
  Nicht-Korpus-Inferenz; der Embedding-Tap bleibt fp32/CPU.
- **ADR 0008** verliert die „int8 als spätere Optimierung"-Formulierung; fp32 ist
  die feste, einzige Präzision.
- **#88:** Das Embedding wird in **fp32 berechnet**; die **fp16-Ablage** am Draft
  bleibt zulässig — sie ist eine verlustarme, **einheitlich** angewandte Speicher-
  Kompression des fp32-Vektors, **keine** Inferenz-Präzision und damit keine
  Kompatibilitäts-Gefahr. Die Versions-Identität des Korpus wird um Backend +
  Präzision erweitert.
- **Card-Art-Generierung (#11) ist NICHT betroffen:** ein generatives Modell, das
  keinen Embedding-Korpus speist, darf weiterhin quantisiert laufen.
- **Größen-Hebel (falls je nötig):** kleineres Backbone, geringere
  Eingangsauflösung oder Klassen-Pruning — **nicht** Quantisierung.
- Verifikations-Protokoll (#63) und Doku/READMEs sind auf „fp32, kein int8-Ausweg"
  angeglichen.
