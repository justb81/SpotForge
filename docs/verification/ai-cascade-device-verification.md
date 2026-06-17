# Geräte-Verifikation der KI-Kaskade (#63)

**Bezug:** [#63] · #9 · #62 (echtes Feinmodell) · #83 (fp32-B0-Gate) ·
[ADR 0008](../adr/0008-modell-export-pipeline-und-lifecycle.md) ·
[ADR 0007](../adr/0007-on-device-inference-executorch.md)
**Module:** `apps/mobile`, `packages/ai-engine`

Gate **und** Feinmodell sind **fest ins CarForge-APK gebündelt** (kein Nachladen/
OTA). Die Agent-Umgebung kann keine App auf einem echten Gerät ausführen —
**Erkennungsqualität, Latenz und Bundle-Größe verifiziert der Mensch auf einem
echten Gerät** (CLAUDE.md „Gelernte Fallstricke"). Dieses Dokument ist das
reproduzierbare Protokoll dafür: Prozedur, **fixierte Budgets** (= geschärfte
Akzeptanzkriterien) und ein **Messwert-Template** zum Ausfüllen.

> Dieses Protokoll dokumentiert das **Verfahren**. Die konkreten Messwerte und die
> Soll/Ist-Bewertung werden im Abschnitt [„Messprotokoll"](#messprotokoll) je
> Gerät/Build erfasst und im Issue #63 verlinkt.

---

## Was jetzt schon messbar ist — und was auf #62 wartet

Die Kaskade läuft als zwei Stufen (`packages/ai-engine/src/cascade.ts`):

- **Gate** (läuft bei **jedem** Spot): EfficientNet-**B0**, ImageNet-1k, **fp32**
  (#83) — ~21,1 MB, ~0,4 GFLOPs. Klärt grob „ist das ein Fahrzeug?" über die
  **summierte** Klassen-Masse (`evaluateGate`).
- **Feinmodell** (nur im **Accept**-Pfad, lazy in den Speicher initialisiert):
  EfficientNet-**B4** / Jordo23 (VMMRdb, 8.949 Klassen), **int8** — geschätzt
  ~33–35 MB, ~4,2 GFLOPs.

| Messung | Jetzt aussagekräftig? | Hinweis |
|---|---|---|
| **Reject-Pfad-Latenz** (Gate-only) | **Ja** | Gate ist das echte, auszuliefernde B0-fp32-Modell (#83). |
| **Bundle-Größe Gate** | **Ja** | 21,1 MB `.pte` im Manifest verankert. |
| **Accept-Pfad-Latenz** (Gate→Fein) | **Nein, erst nach #62** | Der PoC nutzt aktuell **das Gate als Platzhalter-Feinmodell** (`apps/mobile/App.tsx`, `initFine: async () => gate`). Die gemessene „Fein"-Zeit ist damit B0, **nicht** B4 — nicht repräsentativ. |
| **Bundle-Größe Feinmodell** | **Nein, erst nach #62** | Echtes int8-`.pte` existiert noch nicht; Größe ist eine Schätzung. |
| **Erkennungsqualität** | **Nein, erst nach #62** | Mit Platzhalter-Feinmodell sinnlos. Qualität ist make-or-break → **zuerst** prüfen, sobald #62 das kalibrierte Modell liefert. |

> **Reihenfolge (aus der #9-Re-Examination):** **Erkennungsqualität zuerst**, dann
> Latenz/Größe. Qualität ist make-or-break und billig zu prüfen; das Tunen von
> Latenz/Größe lohnt erst, wenn die Qualität trägt. Diese Reihenfolge greift,
> sobald **#62** das echte Feinmodell bereitstellt.

---

## Budgets (geschärfte Akzeptanzkriterien)

Die folgenden Werte sind die **Vorschlags-Budgets** (Stand der Schätzungen aus der
#9/#63-Diskussion). Sie sind **vor** dem ersten Geräte-Lauf zu **ratifizieren**;
danach gilt: Messwert ≤ Budget ⇒ bestanden, sonst [Folgeentscheidung](#bei-budget-überschreitung).
Referenzgerät: ein **repräsentatives Mid-Range-Android** (das PoC-Testgerät) — die
Akzeptanz zählt auf diesem Profil, nicht auf einem High-End-Flaggschiff.

### Latenz (Wall-Clock pro Spot, inkl. Bilddekodierung + Vorverarbeitung)

| Pfad | Was zählt | Budget (Vorschlag) |
|---|---|---|
| **Reject** (Gate-only) | `gateMs` ≈ `totalMs` | **≤ 250 ms** |
| **Accept** (Gate→Fein, *warm*) | `totalMs` ohne `fineInitMs` | **≤ 800 ms** |
| **Fein-Kaltstart** (einmalig, erster Accept) | `fineInitMs` | **≤ 2000 ms** (einmalig, separat) |

> Der **Fein-Kaltstart** (`fineInitMs`) ist eine **einmalige** Speicher-
> Initialisierung beim ersten akzeptierten Gate und zählt **nicht** gegen das
> Pro-Spot-Budget. Die On-Screen-Anzeige weist ihn separat als `(+Init …)` aus.
> Nach #83 dominiert **nicht mehr das Gate**, sondern das **B4-Feinmodell** den
> teuren Pfad (Gate B0 ~0,4 vs. Fein B4 ~4,2 GFLOPs); für B4 mobil gibt es **keine
> veröffentlichten Latenzen** (Qualcomm AI Hub führt B4 als „not supported") →
> der Accept-Pfad **muss** gemessen werden.

### Bundle-Größe (APK-Zuwachs durch die gebündelten `.pte`)

| Artefakt | Rolle | Größe (int8/fp32) | Quelle |
|---|---|---|---|
| `gate_imagenet_efficientnet_b0_fp32.pte` | Gate (immer) | **21,1 MB** | Manifest (`bytes: 21148320`) |
| Feinmodell B4/Jordo23 (int8) | Fein (Accept) | **~33–35 MB** (Schätzung) | #62-Diskussion |
| **Summe Modelle** | | **≈ 54–56 MB** | |

**Budget: APK-Größenzuwachs durch beide `.pte` ≤ 65 MB.** (`.pte`-Assets liegen im
APK weitgehend unkomprimiert; Puffer für Label-Sätze + Alignment.) Gemessen als
Differenz `APK mit Modellen` − `APK ohne Modelle` (oder absolute APK-Größe gegen
einen dokumentierten Baseline-Build).

### Erkennungsqualität (reale Spots, **nach #62**)

| Metrik | Budget (Vorschlag) | Erhebung |
|---|---|---|
| **Top-5-Trefferquote auf realen Handy-Fotos** | **≥ 60 %** | ≥ 50 reale Spots, **getrennt** von sauberen Katalogbildern |
| **Top-1** (nachrichtlich) | dokumentieren | dieselbe Stichprobe |

> ⚠️ Die Modellkarten-Zahlen (Top-1 ≈ 50 %, Top-5 ≈ 75–80 %) gelten auf dem
> **VMMRdb-eigenen Split**. Auf realen Fotos (Straßenwinkel, Glanz, Teilverdeckung)
> wird es schlechter; **VMMRdb endet 2016** → Fahrzeuge ab MJ 2017 sind ein
> **blinder Fleck**. Die Stichprobe muss genau das abbilden (Mix aus Alt/Neu,
> diverse Marken/Winkel/Licht). Saubere Katalogbilder **getrennt** ausweisen.

---

## Vorbereitung

1. **Test-APK bauen** über den Workflow `.github/workflows/poc-android-apk.yml`
   (`PoC Android APK`): in der Actions-UI manuell starten (Branch wählen) **oder**
   per API mit beliebigem `ref`. Eingabe `variant` = `cars` (Default). Der Workflow
   zieht via `pnpm fetch-models` **beide** im Manifest gelisteten Modelle, bündelt
   sie als Metro-Assets und baut ein signiertes Release-APK (Debug-Keystore, zum
   Sideloaden).
2. **APK-Artefakt** aus dem Run laden (`cars-poc-apk`, Retention 14 Tage) und auf
   das Zielgerät sideloaden (`adb install -r <apk>` oder Datei-Transfer).
3. **Gerät dokumentieren:** Modell, SoC, RAM, Android-Version (siehe Template).

> Solange #62 offen ist, enthält das Manifest nur das Gate-`.pte`; der PoC nutzt
> das Gate als Platzhalter-Feinmodell. Reject-Pfad-Latenz und Gate-Bundle-Größe
> sind damit schon belastbar messbar.

## Prozedur

Die On-Screen-**Latenzanzeige** ist eingebaut (`SpotScreen` → `renderLatency`,
gespeist aus `CascadeTimings`): nach jedem Spot erscheint eine dezente Zeile, z.B.

```
Gate 142 ms · Fein 88 ms · Σ 230 ms (+Init 410 ms)
```

— im Reject-Pfad ohne den Fein-Anteil: `Gate 142 ms · Σ 142 ms`. So ist die
Latenz **ohne** Profiler/Metro-Overlay direkt am Gerät ablesbar (kein
Standalone-Release-Blindflug).

1. **Reject-Pfad messen:** mehrere **Nicht-Fahrzeuge** spotten (Tier, Pflanze,
   Gebäude, Person). Erwartung: Reject-Meldung; `Gate …·Σ …` ablesen. Pro Gerät
   ≥ 5 Läufe; **Median** notieren (erster Lauf separat = warm/kalt-Effekt).
2. **Accept-Pfad messen** *(belastbar erst nach #62)*: mehrere **Fahrzeuge**
   spotten. Den **ersten** Accept separat notieren (enthält `+Init …` = Fein-
   Kaltstart), danach den **warmen** Steady-State (`Σ` ohne Init). ≥ 5 warme Läufe;
   Median.
3. **Erkennungsqualität** *(nach #62)*: ≥ 50 reale Spots gemäß
   [Stichproben-Methodik](#erkennungsqualität-reale-spots-nach-62). Für jeden Spot
   Top-1 + ob das korrekte Modell in den Top-5 ist; getrennt Alt-/Neu-Fahrzeuge.
4. **Bundle-Größe** erfassen: APK-Größe gegen den dokumentierten Baseline-Build.

---

## Messprotokoll

Pro Gerät/Build eine Tabelle ausfüllen (Datum, App-Version, Commit/Run-ID angeben).

### Gerät & Build

| Feld | Wert |
|---|---|
| Datum | _…_ |
| Gerät (Modell / SoC / RAM) | _…_ |
| Android-Version | _…_ |
| App-Version (`v…` aus Error-/Latenz-Anzeige) | _…_ |
| APK-Quelle (Workflow-Run-ID / Branch / Commit) | _…_ |
| Manifest enthält Feinmodell? (#62 erledigt?) | _ja/nein_ |

### Latenz (Median über N Läufe)

| Pfad | N | gateMs | fineMs | totalMs | fineInitMs (1. Accept) | Budget | Soll/Ist |
|---|---|---|---|---|---|---|---|
| Reject (Gate-only) | _…_ | _…_ | – | _…_ | – | ≤ 250 ms | _…_ |
| Accept (warm) | _…_ | _…_ | _…_ | _…_ | – | ≤ 800 ms | _…_ |
| Fein-Kaltstart (1×) | 1 | – | – | – | _…_ | ≤ 2000 ms | _…_ |

### Bundle-Größe

| Größe | Wert | Budget | Soll/Ist |
|---|---|---|---|
| Gate `.pte` | 21,1 MB | – | – |
| Feinmodell `.pte` | _… (nach #62)_ | – | – |
| APK-Zuwachs durch beide `.pte` | _…_ | ≤ 65 MB | _…_ |

### Erkennungsqualität (nach #62)

| Stichprobe | n | Top-1 | Top-5 | Budget Top-5 | Soll/Ist |
|---|---|---|---|---|---|
| Reale Handy-Fotos (gemischt) | _…_ | _…_ | _…_ | ≥ 60 % | _…_ |
| davon MJ ≥ 2017 (Blindfleck) | _…_ | _…_ | _…_ | – | _…_ |
| Saubere Katalogbilder (Referenz) | _…_ | _…_ | _…_ | – | _…_ |

---

## Bei Budget-Überschreitung

Konkrete Folgeentscheidung dokumentieren (Akzeptanzkriterium #63). Mögliche Hebel:

- **Latenz Accept-Pfad zu hoch:** kleineres Backbone (B4 → B3/B2), geringere
  Eingangsauflösung (380 → 300/260), stärkere/selektivere Quantisierung des
  Feinmodells.
- **Bundle zu groß:** stärkere Quantisierung (int8 schon gesetzt; Klassen-Kopf des
  8.949-Klassen-B4 ist der Treiber), kleineres Backbone, Klassen-Pruning.
- **Erkennungsqualität zu niedrig:** echte int8-Kalibrierung (#62) verbessern,
  fp16/teilweise Quantisierung, repräsentativeren Kalibrier-/Trainings-Datensatz,
  ggf. anderes Feinmodell. Blindfleck MJ ≥ 2017 explizit adressieren.

Quellen: [Jordo23/vehicle-classifier](https://huggingface.co/Jordo23/vehicle-classifier) ·
[Qualcomm AI Hub – EfficientNet-B4](https://aihub.qualcomm.com/compute/models/efficientnet_b4)

[#63]: https://github.com/justb81/SpotForge/issues/63
