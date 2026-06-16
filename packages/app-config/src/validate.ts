// Laufzeit-Validierung von {@link AppDefinition} (struktur) und {@link Branding}
// (struktur + optionale Asset-Existenz). RN-tauglich: ohne `node:`-Import. Die
// Existenzprüfung wird injiziert (der Loader reicht `fs.existsSync` herein),
// damit dieses Modul auch im Mobile-Bundle ladbar bleibt.

import type { AppDefinition } from "./app-definition";
import type { Branding } from "./branding";
import { appDefinitionSchema, brandingSchema } from "./schema";

/** Ein einzelnes Validierungsproblem mit Pfad und Klartext-Meldung. */
export interface AppDefinitionIssue {
  /** Punktnotierter Feldpfad, z.B. `category.guardrails.allowed`. */
  path: string;
  /** Menschlich lesbare Beschreibung des Problems. */
  message: string;
}

/** Ergebnis von {@link validateAppDefinition}. */
export type ValidationResult =
  | { readonly valid: true; readonly definition: AppDefinition }
  | { readonly valid: false; readonly issues: AppDefinitionIssue[] };

/** Mappt Zod-Fehler auf {@link AppDefinitionIssue}s. */
function zodIssues(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): AppDefinitionIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)",
    message: issue.message,
  }));
}

/**
 * Validiert eine (potentiell unvollständige) Eingabe gegen das AppDefinition-
 * Schema: Pflichtfelder, gültige `CategoryId`s, Bereich von `minConfidence` und
 * die Guardrail-Konsistenz (primäre Kategorie ∈ `allowed`). Theme/Assets sind
 * nicht mehr Teil der AppDefinition (ADR 0011) – siehe {@link validateBranding}.
 * Sammelt **alle** Probleme, statt beim ersten abzubrechen.
 */
export function validateAppDefinition(input: unknown): ValidationResult {
  const parsed = appDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, issues: zodIssues(parsed.error) };
  }
  return { valid: true, definition: parsed.data };
}

/** Optionen der Branding-Validierung. */
export interface ValidateBrandingOptions {
  /**
   * Optionale Existenzprüfung. Bekommt den bereits **aufgelösten** Asset-Pfad
   * (so wie ihn {@link resolveBranding} liefert) und meldet, ob die Datei
   * existiert. Ohne dieses Feld werden Asset-Pfade nur strukturell geprüft. Als
   * Funktion injiziert, damit @spotforge/app-config ohne `node:fs` auskommt.
   */
  exists?: (assetPath: string) => boolean;
}

/** Ergebnis von {@link validateBranding}. */
export type BrandingValidationResult =
  | { readonly valid: true; readonly branding: Branding }
  | { readonly valid: false; readonly issues: AppDefinitionIssue[] };

/** Sammelt alle gesetzten Asset-Pfade eines aufgelösten Brandings mit ihrem Feldnamen. */
function collectBrandingAssetPaths(assets: Branding["assets"]): { field: string; path: string }[] {
  const paths = [
    { field: "assets.icon", path: assets.icon },
    { field: "assets.splash", path: assets.splash },
    { field: "assets.logo", path: assets.logo },
  ];
  if (assets.background !== undefined) {
    paths.push({ field: "assets.background", path: assets.background });
  }
  if (assets.cardFrames !== undefined) {
    for (const [rarity, path] of Object.entries(assets.cardFrames)) {
      if (path !== undefined) {
        paths.push({ field: `assets.cardFrames.${rarity}`, path });
      }
    }
  }
  return paths;
}

/**
 * Validiert ein **aufgelöstes** {@link Branding} (Ergebnis von
 * {@link resolveBranding}): strukturelle Vollständigkeit (Theme-Farben, Pflicht-
 * Assets) und – wenn {@link ValidateBrandingOptions.exists} gesetzt ist – die
 * Existenz der referenzierten Asset-Dateien.
 */
export function validateBranding(
  input: unknown,
  options: ValidateBrandingOptions = {},
): BrandingValidationResult {
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) {
    return { valid: false, issues: zodIssues(parsed.error) };
  }

  const branding = parsed.data;

  if (options.exists !== undefined) {
    const missing: AppDefinitionIssue[] = [];
    for (const { field, path } of collectBrandingAssetPaths(branding.assets)) {
      if (!options.exists(path)) {
        missing.push({ path: field, message: `Asset-Datei nicht gefunden: ${path}` });
      }
    }
    if (missing.length > 0) {
      return { valid: false, issues: missing };
    }
  }

  return { valid: true, branding };
}

/**
 * Fehler einer fehlgeschlagenen Validierung. Die Meldung listet alle
 * Einzelprobleme auf; das strukturierte {@link AppDefinitionError.issues}-Array
 * steht für programmatische Auswertung bereit.
 */
export class AppDefinitionError extends Error {
  readonly issues: AppDefinitionIssue[];

  constructor(issues: AppDefinitionIssue[], context?: string, kind = "AppDefinition") {
    const subject = context ? `${kind} '${context}'` : kind;
    const header = `${subject} ist ungültig (${issues.length} Problem(e)):`;
    super([header, ...issues.map((issue) => `  • ${issue.path}: ${issue.message}`)].join("\n"));
    this.name = "AppDefinitionError";
    this.issues = issues;
  }
}

/**
 * Wie {@link validateAppDefinition}, wirft aber bei Fehlern einen
 * {@link AppDefinitionError} mit klarer Meldung und gibt sonst die validierte
 * Definition zurück. Praktisch als Build-Zeit-Wächter.
 */
export function assertAppDefinition(input: unknown): AppDefinition {
  const result = validateAppDefinition(input);
  if (!result.valid) {
    throw new AppDefinitionError(result.issues, readId(input));
  }
  return result.definition;
}

/** Liest `id` aus einer Eingabe für aussagekräftige Fehlermeldungen; sonst undefined. */
function readId(input: unknown): string | undefined {
  if (input !== null && typeof input === "object" && "id" in input) {
    const id = (input as { id: unknown }).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return undefined;
}
