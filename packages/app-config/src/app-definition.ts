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

  // Theme & Assets sind bewusst NICHT Teil der AppDefinition (ADR 0011): sie
  // leben als Branding (@spotforge/app-config `branding.ts`) in einer eigenen
  // Config je Variante, mit `variants/_default` als generischer Basis.
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
  /** Mindest-Konfidenz 0..1, darunter wird abgelehnt. */
  minConfidence: number;
  /** Mehrsprachige Meldung, wenn ein Objekt außerhalb des Scopes gespottet wird. */
  rejectMessage: LocalizedText;
}

/**
 * Modell-seitiges **Gate** (ADR 0010, GDD §5.1): welche **rohen Klassifikations-
 * Labels** des breiten Gate-Modells als „im Scope" gelten. Anders als
 * {@link CategoryGuardrails.allowed} (Domänen-Kategorien) sind das die konkreten
 * Label-Strings des Gate-Modells – für die Auto-App z.B. die ImageNet-Fahrzeug-
 * klassen. Die Annahme-Schwelle teilt sich das Gate mit
 * {@link CategoryGuardrails.minConfidence}.
 */
export interface CategoryGate {
  /** Erlaubte rohe Gate-Labels (mind. eines), exakt im Vokabular des Gate-Modells. */
  allow: string[];
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
