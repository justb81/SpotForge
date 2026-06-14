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
  };

  /** Prompts für die On-Device-KI (@spotforge/ai-engine). */
  ai: AiPrompts;

  /** Visuelle Theme-Tokens (@spotforge/ui). */
  theme: ThemeTokens;

  /** Text-Overrides; fehlende Schlüssel fallen auf gemeinsame Defaults zurück. */
  content: ContentOverrides;

  /** Grafiken; Pfade relativ zum Variantenverzeichnis. */
  assets: AssetManifest;
}

/** Grenzen dessen, was der Klassifikator als gültiges Objekt akzeptiert. */
export interface CategoryGuardrails {
  /** Erlaubte Kategorien (i.d.R. nur die primäre). */
  allowed: CategoryId[];
  /** Mindest-Konfidenz 0..1, darunter wird abgelehnt. */
  minConfidence: number;
  /** Meldung, wenn ein Objekt außerhalb des Scopes gespottet wird. */
  rejectMessage: string;
}

export interface AiPrompts {
  /** Optionale Steuerung der (Fein-)Klassifikation. */
  classificationHint?: string;
  /** Template für die Card-Art-Generierung (Platzhalter z.B. {objectName}, {rarity}). */
  cardArtPrompt: string;
  /** Template für Fakten-Extraktion/-Anreicherung. */
  factPrompt: string;
}

export interface ThemeTokens {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily?: string;
  };
  /** Basis-Eckenradius in px. */
  radius?: number;
}

/**
 * Text-Overrides als flache Key→Wert-Map (i18n-Schlüssel). Nicht gesetzte
 * Schlüssel nutzen die gemeinsamen Defaults aus @spotforge/app-shell.
 */
export type ContentOverrides = Record<string, string>;

export interface AssetManifest {
  icon: string;
  splash: string;
  logo: string;
  /** Seltenheits-Kartenrahmen (C/U/R/E/L) – Pfade relativ zur Variante. */
  cardFrames?: Partial<Record<"common" | "uncommon" | "rare" | "epic" | "legendary", string>>;
  background?: string;
}

/**
 * Identitäts-Helper: gibt die Definition unverändert zurück, erzwingt aber
 * Typprüfung und ist der dokumentierte Einstiegspunkt für Varianten.
 */
export function defineApp(definition: AppDefinition): AppDefinition {
  return definition;
}
