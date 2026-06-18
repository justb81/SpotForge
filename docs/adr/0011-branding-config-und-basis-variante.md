# ADR 0011 – Branding-Config & generische Basis-Variante (`_default`)

- **Status:** Akzeptiert (Frame-Anteil teilweise abgelöst durch
  [ADR 0015](./0015-prozeduraler-kartenrahmen-svg.md))
- **Datum:** 2026-06-16
- **Bezug:** ADR 0002 (White-Label/Multi-Tenancy); Issues #12, #16. Verfeinert das
  in ADR 0002 etablierte „neue App = neue Konfiguration"-Prinzip um eine
  **Vererbung von Theme & Assets**.

> **Hinweis (ADR 0015, #96):** Die Seltenheits-**Kartenrahmen** sind **keine
> Assets** mehr, sondern werden prozedural gerendert (`react-native-svg`). Die
> Aussagen unten zu gebündelten Frame-PNGs (`variants/_default/assets/frames/`),
> zur Frame-Vererbung und zu `tools/gen-ui-frames.py` sind dadurch ersetzt. Der
> Rest dieses ADR (Theme- & Asset-Branding, `variants/_default` als Basis,
> `resolveBranding`) gilt unverändert.

## Kontext

Bis hierher trug die `AppDefinition` (`@spotforge/app-config`) **alles**: Identität,
Kategorie/Guardrails, KI-Prompts, Text-Overrides – **und** `theme` (Theme-Tokens)
sowie `assets` (Icon/Splash/Logo/Hintergrund/Kartenrahmen). Jede Variante musste
diese Präsentationsdaten **vollständig** angeben.

Zwei Probleme:

- **Generische Assets hatten keine Heimat.** Die Seltenheits-Kartenrahmen sind
  kategorie-neutral (rein rarity-gefärbt) und sollten von **allen** Apps geteilt
  werden. Sie lagen zwischenzeitlich in `packages/ui` – das verletzt die
  Abhängigkeitsrichtung (`ui` darf nicht aus `variants/` lesen) und vermischt
  generische Präsentation mit dem Code-Paket.
- **Kein Default/Override-Mechanismus.** Jede neue Variante müsste Theme und alle
  Assets von Grund auf wiederholen, statt nur ihre Abweichungen zu liefern.

## Entscheidung

**1. `theme` + `assets` werden aus der `AppDefinition` herausgelöst** in eine
eigene **`Branding`-Config** (`@spotforge/app-config` → `branding.ts`). Die
`AppDefinition` trägt nur noch das Funktionale (`id`, `identity`, `category`,
`ai`, `content`). Pro Variante zwei Dateien:

- `variants/<name>/app.definition.ts` – funktionale Definition.
- `variants/<name>/branding.config.ts` – `defineBranding({ theme?, assets? })`,
  nur **Abweichungen**.

**2. `variants/_default` ist die generische Basis-Variante.** Sie liefert das
Default-`Branding`: ein neutrales Theme und die **generischen Kartenrahmen**
(`variants/_default/assets/frames/`). Sie hat **kein** `app.definition.ts` und ist
keine eigenständige, baubare App – nur Branding-Basis.

**3. Auflösung per Deep-Merge zur Build-/Load-Zeit.** `resolveBranding({ base,
baseDir, variant, variantDir })` legt die Variante über die Basis:

- **Theme** wird tief gemergt (eine Variante überschreibt z.B. nur `colors.primary`
  und erbt den Rest).
- **Assets** werden pro Feld bzw. pro Rarity-Frame gewählt (Variante gewinnt, sonst
  Basis); jeder Pfad wird gegen **sein** Quell-Verzeichnis aufgelöst. CarForge
  liefert eigenes Icon/Splash/Logo + Theme-Overrides und **erbt** die Rahmen aus
  `_default`.

Das Ergebnis ist ein **vollständiges** `Branding`, das `validateBranding`
strukturell (Theme + Pflicht-Assets) und auf Datei-Existenz prüft.

**Begleitende Festlegungen:**

- **`packages/ui` bleibt rein:** `CardView` nimmt nur eine fertige `frames`-Map
  (`ResolvedCardFrames`); das Paket liest selbst keine Variant-Assets. Die
  generischen Rahmen sind Branding (`_default`), kein ui-Asset.
- **Build-Host wiring:** `apps/mobile/app.config.ts` löst das Branding auf,
  nutzt `assets.icon`/`splash` + `theme.colors.background` und legt das aufgelöste
  Branding nach `expoConfig.extra.appBranding`. `App.tsx` reicht `theme` an die
  generische `SpotForgeApp`, die es per `ThemeProvider` dem Design-System bereitstellt.
- **Theme-Konsum über Context:** app-shell-Komponenten lesen das Theme via
  `useTheme()` statt aus der `AppDefinition`.

## Konsequenzen

- **`AppDefinition` schrumpft** (kein `theme`/`assets`); `validateAppDefinition`
  prüft nur noch Struktur, die Asset-Existenz wandert in `validateBranding`.
- **Loader** (`loadVariant`) liefert zusätzlich das aufgelöste `branding`.
- **Neue Variante** = `app.definition.ts` + `branding.config.ts` (nur Abweichungen);
  generische Rahmen werden geerbt, nicht kopiert.
- Die generischen Rahmen werden reproduzierbar über `tools/gen-ui-frames.py` nach
  `variants/_default/assets/frames/` erzeugt.

## Alternativen

- **Theme/Assets in der `AppDefinition` belassen, `_default` nur als Default-Quelle.**
  Verworfen: `app.definition.ts` bliebe mit Präsentationsdaten vermischt; der
  Override-Schnitt wäre unklarer.
- **Generische Rahmen in `packages/ui` bündeln.** Verworfen: verletzt die
  Abhängigkeitsrichtung und macht `ui` asset-abhängig.
- **Build-Zeit-Kopie aller Assets in ein Staging-Verzeichnis.** Aufgeschoben:
  derzeit nicht nötig, da die Pfadauflösung pro Quelle genügt; kann später für ein
  einheitliches Asset-Verzeichnis ergänzt werden.
