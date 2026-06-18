# ADR 0015 – Prozedural gerenderter Kartenrahmen (SVG) statt Frame-Bilder

- **Status:** Akzeptiert
- **Datum:** 2026-06-18
- **Bezug:** Issue #96; GDD §4.2/§5.3/§7.3/§10.1. **Löst den Frame-Anteil von
  [ADR 0011](./0011-branding-config-und-basis-variante.md) ab** (Theme/Assets-
  Branding bleibt im Übrigen gültig). Lehren aus #48–#51 (Bridgeless/New
  Architecture), Supply-Chain-Härtung aus [ADR 0006](./0006-supply-chain-hardening.md).

## Kontext

Der Seltenheits-Kartenrahmen war bis hierher ein gebackenes **750×1050-PNG je
Stufe** (`variants/_default/assets/frames/*.png`, erzeugt von
`tools/gen-ui-frames.py`), das `CardView` full-bleed als Karten-Hintergrund
zeichnete. Der Build-Host löste die Frames als Branding-Assets auf und reichte
eine fertige Map (`ResolvedCardFrames`) durch die gesamte App
(`SpotForgeApp → AppNavigator → SpotScreen → DraftPanel → CardView`).

Probleme:

- **Asset statt Konfiguration.** Eine Marke mit eigenem Look müsste fünf PNGs neu
  exportieren – Widerspruch zur goldenen Regel „neue App = Konfiguration, kein
  Asset".
- **Doppelte Wahrheit.** Die Stufen-Farben lagen in `RARITY_STYLES` **und** in der
  PNG-Palette (`gen-ui-frames.py`); ein Kommentar mahnte ausdrücklich zur
  Synchronhaltung – Drift-Risiko.
- **Raster-Grenzen.** Feste Auflösung; der `stretch`-Pfad ist auf der New
  Architecture (Fabric) unzuverlässig.
- **Statisch.** Foil/Legendary ließen sich nicht animieren (Glow/Verlauf).

## Entscheidung

**1. Der Rahmen wird prozedural mit `react-native-svg` gerendert.** Eine neue
Komponente `CardFrame` (`packages/ui`) zeichnet Rahmenring, Stufen-Glow, hellen
Karten-Body, eine theme-getönte Innenlinie und Edelstein-Ornamente
auflösungsunabhängig (5:7, randscharf).

- **`RARITY_STYLES` ist die einzige Farbquelle** der Stufe. Die Ringfarbe (und der
  Glow) kommen ausschließlich von dort; die PNG-Palette entfällt – damit auch die
  doppelte Wahrheit.
- **Geometrie eskaliert mit der Stufe** (`cardFrameSpec`, rein/testbar):
  Rahmenbreite, Anzahl Glow-Ringe, Edelstein-Größe und – ab Rare – Eck-Ornamente.
  So sind C/U/R/E/L **auch monochrom** über die Form unterscheidbar.
- **Theme-Tönung statt Asset-Override.** Die Innenlinie nutzt `theme.colors.primary`,
  der Eckenradius `theme.radius`. Ein Varianten-Theme prägt den Rahmen sichtbar –
  Rebrand **ohne neue Assets**.
- **Foil** wird im selben SVG-Ansatz behandelt: `FoilOverlay` rendert die
  Schimmer-Bänder jetzt als diagonalen `react-native-svg`-Verlauf (statt gedrehter
  Views). Eine Animation des Verlaufs ist später denkbar.

**2. Der Altpfad entfällt vollständig** (goldene Regel #6, keine Parallelpfade):
`variants/_default/assets/frames/*`, `tools/gen-ui-frames.py`, die UI-Typen/Helfer
`ResolvedCardFrames`/`CardFrameSources`/`mergeCardFrames`, das `frames`-Prop-
Threading durch die App **und** der Frame-Anteil des Brandings (`AssetManifest.
cardFrames`, `CARD_FRAME_RARITIES`, deren Validierung/Schema). Der Rahmen ist damit
weder ui-Asset noch Branding-Asset.

**3. Kein spekulativer Bild-Override.** Ein optionaler per-Variante-**Bild**-Rahmen
wird **nicht** auf Vorrat gebaut, sondern erst bei echtem Bedarf (dann als eigenes
ADR).

**Dependency-Disziplin:** `react-native-svg` ist auf eine **≥ 7 Tage alte** Version
gepinnt (`15.15.5`, ADR 0006) und **New-Architecture-/Bridgeless-tauglich** (Fabric
seit der 15.x-Reihe); kein Config-Plugin nötig (Autolinking). Es werden keine
`.svg`-Dateien importiert (keine Metro-Transformer-Änderung) – der Rahmen ist
reiner Komponenten-Code.

## Konsequenzen

- **`packages/ui` bleibt rein**, wird aber aktiver: `CardFrame`/`FoilOverlay` zeichnen
  aus `RARITY_STYLES` + Theme; `CardView` nimmt **kein** `frames`-Prop mehr.
- **`AppDefinition`/Branding schrumpfen** um den Frame-Anteil; `validateBranding`
  prüft nur noch icon/splash/logo/background.
- **Verifikation:** Die Stufen→Farbe/Geometrie-Logik ist in vitest getestet; die
  SVG-Darstellung wird auf einem echten Gerät verifiziert (APK aus dem Repo, kein
  Emulator – Mensch).
- **ADR 0011 gilt weiter** für Theme/Assets-Branding und `variants/_default` als
  Branding-Basis; nur die Aussagen zu gebündelten Rahmen-Assets und
  `gen-ui-frames.py` sind durch dieses ADR ersetzt.

## Alternativen

- **PNG-Frames behalten und nur die Palette aus `RARITY_STYLES` generieren.**
  Verworfen: bleibt Asset-gebunden (Rebrand = Re-Export), löst Raster-Grenzen und
  fehlende Animierbarkeit nicht.
- **`.svg`-Dateien als Assets bündeln und via `SvgUri`/Transformer laden.**
  Verworfen: weiterhin Assets statt Konfiguration und zusätzlicher Metro-
  Transformer; der Rahmen ist vollständig aus Stufe + Theme ableitbar.
- **Per-Variante-Bild-Override jetzt mitbauen.** Aufgeschoben: kein aktueller
  Bedarf; würde einen zweiten Rahmen-Pfad einführen (Parallelpfad).
