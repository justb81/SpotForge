import type { CategoryId } from "@spotforge/game-core";

/**
 * Vollständige Definition einer SpotForge-App. Aus einer AppDefinition wird zur
 * Build-Zeit eine eigenständige App erzeugt – ohne Code-Änderung. Siehe README.
 */
export interface AppDefinition {
  /** Stabiler Identifier, zugleich Mandanten-Key (appId) am zentralen Server. */
  id: string;

  /** Store- und Build-Identität. */
  identity: {
    displayName: string;
    /** Expo-Slug. */
    slug: string;
    /** Deep-Link-Scheme. */
    scheme: string;
    ios: { bundleIdentifier: string };
    android: { package: string };
  };

  /** Welche Kategorie diese App schmiedet und was die KI akzeptieren darf. */
  category: {
    primary: CategoryId;
    guardrails: CategoryGuardrails;
    /** Modell-seitiges Gate (rohe Klassifikations-Labels), siehe {@link CategoryGate}. */
    gate: CategoryGate;
  };

  /** Prompts für die On-Device-KI (@spotforge/ai-engine). */
  ai: AiPrompts;

  /** Text-Overrides; fehlende Schlüssel fallen auf gemeinsame Defaults zurück. */
  content: ContentOverrides;

  /** Optionale Feature-Schalter der App. Fehlt das Feld, gelten alle Defaults. */
  features?: AppFeatures;

  // Theme & Assets sind bewusst NICHT Teil der AppDefinition (ADR 0011): sie
  // leben als Branding (@spotforge/app-config `branding.ts`) in einer eigenen
  // Config je Variante, mit `variants/_default` als generischer Basis.
}

/**
 * Per-Variante schaltbare Features. Jeder Schalter ist optional und standardmäßig
 * **aus** – eine App aktiviert nur, was sie wirklich braucht (siehe
 * {@link resolveFeatures} für die aufgelösten Defaults).
 */
export interface AppFeatures {
  /**
   * Erlaubt, zusätzlich zum Kamera-Foto ein **bestehendes Bild aus der Galerie**
   * zu laden (eigener Button) und es durch dieselbe Spot-Kette (Gate →
   * Feinmodell → Draft) zu schicken. Standard: aus. Primär ein Test-/QA-Komfort
   * – so lässt sich der Spot-Flow ohne frisches Foto auf der Straße prüfen. Kein
   * Upload: das gewählte Bild bleibt lokal und wird nur on-device klassifiziert.
   */
  imageImport?: boolean;
  /**
   * Master-Schalter für den **Auto-Spot**-Modus (#85, ADR 0010): statt jedes Mal
   * manuell auszulösen, nimmt die App in einem festen Intervall selbst ein Foto
   * auf und schickt es durch die normale Spot→Draft-Pipeline. Standard: aus –
   * der manuelle Tap-Auslöser bleibt der Default. Ist der Schalter aus, erscheinen
   * weder die Hold→Swipe-Geste noch der Settings-Schalter. Die Detail-Parameter
   * (Intervall, Auto-Feuer-Schwelle) liefert {@link CategoryGate.auto}.
   */
  autoSpot?: boolean;
}

/**
 * Löst die optionalen {@link AppFeatures} einer Definition auf konkrete Werte auf
 * (fehlendes Feld/fehlender Schalter ⇒ Default). Einzige Stelle, an der die
 * Feature-Defaults definiert sind – Konsumenten fragen nur das Ergebnis ab.
 */
export function resolveFeatures(definition: AppDefinition): Required<AppFeatures> {
  return {
    imageImport: definition.features?.imageImport ?? false,
    autoSpot: definition.features?.autoSpot ?? false,
  };
}

/**
 * Unterstützte Sprachcodes (ISO 639-1). Jeder benutzersichtbare Text einer
 * Variante muss für **alle** hier gelisteten Sprachen vorliegen.
 */
export type LocaleCode = "de" | "en";

/**
 * Ein mehrsprachiger Text: pro unterstütztem {@link LocaleCode} genau eine
 * Übersetzung. Das `Record` erzwingt Vollständigkeit – fehlt eine Sprache,
 * schlägt die Typprüfung fehl.
 */
export type LocalizedText = Record<LocaleCode, string>;

/** Standard-Sprache, wenn keine bevorzugte Sprache bekannt ist. */
export const DEFAULT_LOCALE: LocaleCode = "de";

/**
 * Löst einen {@link LocalizedText} in die bevorzugte Sprache auf. Fehlt diese,
 * wird auf {@link DEFAULT_LOCALE} und schließlich auf die erste vorhandene
 * Übersetzung zurückgefallen.
 */
export function resolveText(text: LocalizedText, locale: LocaleCode = DEFAULT_LOCALE): string {
  return text[locale] ?? text[DEFAULT_LOCALE] ?? Object.values(text)[0] ?? "";
}

/** Grenzen dessen, was der Klassifikator als gültiges Objekt akzeptiert. */
export interface CategoryGuardrails {
  /** Erlaubte Kategorien (i.d.R. nur die primäre). */
  allowed: CategoryId[];
  /**
   * Gate-Annahme-Schwelle 0..1: Mindest-**summierte** Wahrscheinlichkeitsmasse
   * über alle erlaubten Gate-Synsets ({@link CategoryGate.allow}, marginale
   * `P(im Scope)`), darunter wird abgelehnt. Bewusst recall-lastig (#83); siehe
   * `evaluateGate` in `@spotforge/ai-engine`.
   */
  minConfidence: number;
  /** Mehrsprachige Meldung, wenn ein Objekt außerhalb des Scopes gespottet wird. */
  rejectMessage: LocalizedText;
}

/**
 * Modell-seitiges **Gate** (ADR 0010, GDD §5.1): welche **rohen Klassifikations-
 * Labels** des breiten Gate-Modells als „im Scope" gelten. Anders als
 * {@link CategoryGuardrails.allowed} (Domänen-Kategorien) sind das die konkreten
 * Label-Strings des Gate-Modells – für die Auto-App z.B. die ImageNet-Fahrzeug-
 * klassen. Die (summierte) Annahme-Schwelle teilt sich das Gate mit
 * {@link CategoryGuardrails.minConfidence}; `evaluateGate` (#83) summiert die
 * Masse über **alle** hier gelisteten Synsets.
 */
export interface CategoryGate {
  /** Erlaubte rohe Gate-Labels (mind. eines), exakt im Vokabular des Gate-Modells. */
  allow: string[];
  /**
   * Parameter des **Auto-Spot**-Modus (#85). Nur relevant, wenn die Variante das
   * Feature aktiviert ({@link AppFeatures.autoSpot}); fehlt das Feld, gelten die
   * {@link DEFAULT_AUTO_SPOT}-Werte (siehe {@link resolveAutoSpot}).
   */
  auto?: AutoSpotConfig;
}

/**
 * Defaults des **Auto-Spot**-Loops (#85). Bewusst getaktet bei ~0,5 fps statt als
 * kontinuierlicher Frame-Processor (vermeidet den nativen Bridgeless-Pfad, vgl.
 * „Gelernte Fallstricke" in CLAUDE.md). Die Auto-Feuer-Schwelle ist **strenger**
 * als die manuelle {@link CategoryGuardrails.minConfidence}: beim manuellen Tap
 * zielt der Nutzer bewusst, im Auto-Modus schwenkt die Kamera über viele Szenen
 * und darf nicht auf ein flüchtiges auto-ähnliches Etwas fehlauslösen.
 */
export interface AutoSpotConfig {
  /**
   * Intervall zwischen zwei Auto-Schüssen in Millisekunden (per User-Setting
   * überschreibbar). Untergrenze über die Back-Pressure: dauert ein
   * Klassifikations-Lauf länger, läuft Auto-Spot „so schnell wie das Gerät kann".
   */
  intervalMs: number;
  /**
   * **Strengere** Auto-Feuer-Schwelle (single-frame) auf die summierte Gate-Masse
   * (`P(im Scope)`), Default höher als {@link CategoryGuardrails.minConfidence}.
   * Kalibrierbar über `tools/export-model/prescreen.py`.
   */
  autoFireMinConfidence: number;
}

/**
 * Default-Parameter des Auto-Spot-Loops (#85), genutzt von {@link resolveAutoSpot},
 * wenn eine Variante {@link CategoryGate.auto} nicht (vollständig) setzt.
 */
export const DEFAULT_AUTO_SPOT: AutoSpotConfig = {
  intervalMs: 2000,
  autoFireMinConfidence: 0.6,
};

/**
 * Erlaubter Bereich für das (per User-Setting überschreibbare) Auto-Spot-Intervall
 * in Millisekunden. Untergrenze hält den Dauerbetrieb akku-/thermik-verträglich
 * (#63), Obergrenze verhindert ein gefühlt „totes" Auto.
 */
export const AUTO_SPOT_INTERVAL_MIN_MS = 1000;
export const AUTO_SPOT_INTERVAL_MAX_MS = 10000;

/**
 * Löst die Auto-Spot-Parameter einer Definition auf konkrete Werte auf:
 * {@link CategoryGate.auto} überschreibt feldweise die {@link DEFAULT_AUTO_SPOT}.
 * Einzige Stelle der Auto-Defaults – Konsumenten (App-Shell-Loop, Settings) fragen
 * nur das Ergebnis ab. Sagt **nichts** darüber aus, ob das Feature aktiv ist
 * (das entscheidet {@link AppFeatures.autoSpot} über {@link resolveFeatures}).
 */
export function resolveAutoSpot(definition: AppDefinition): AutoSpotConfig {
  const auto = definition.category.gate.auto;
  return {
    intervalMs: auto?.intervalMs ?? DEFAULT_AUTO_SPOT.intervalMs,
    autoFireMinConfidence: auto?.autoFireMinConfidence ?? DEFAULT_AUTO_SPOT.autoFireMinConfidence,
  };
}

/**
 * Klemmt ein (z.B. aus einem User-Setting stammendes) Auto-Spot-Intervall auf den
 * erlaubten Bereich {@link AUTO_SPOT_INTERVAL_MIN_MS}…{@link AUTO_SPOT_INTERVAL_MAX_MS}.
 */
export function clampAutoSpotInterval(intervalMs: number): number {
  if (!Number.isFinite(intervalMs)) return DEFAULT_AUTO_SPOT.intervalMs;
  return Math.min(
    AUTO_SPOT_INTERVAL_MAX_MS,
    Math.max(AUTO_SPOT_INTERVAL_MIN_MS, Math.round(intervalMs)),
  );
}

export interface AiPrompts {
  /** Optionale Steuerung der (Fein-)Klassifikation. */
  classificationHint?: string;
  /** Template für die Card-Art-Generierung (Platzhalter z.B. {objectName}, {rarity}). */
  cardArtPrompt: string;
  /** Template für Fakten-Extraktion/-Anreicherung. */
  factPrompt: string;
}

/**
 * Text-Overrides als flache Map vom i18n-Schlüssel auf einen mehrsprachigen
 * Text. Jeder Override muss für alle {@link LocaleCode}s übersetzt sein. Nicht
 * gesetzte Schlüssel nutzen die gemeinsamen Defaults aus @spotforge/app-shell.
 */
export type ContentOverrides = Record<string, LocalizedText>;

/**
 * Identitäts-Helper: gibt die Definition unverändert zurück, erzwingt aber
 * Typprüfung und ist der dokumentierte Einstiegspunkt für Varianten.
 */
export function defineApp(definition: AppDefinition): AppDefinition {
  return definition;
}
