// Laufzeit-Validierung einer {@link AppDefinition}. RN-tauglich: ohne `node:`-
// Import. Die optionale Asset-Existenzprüfung wird über Funktionen injiziert
// (der Loader reicht `fs.existsSync`/`path.resolve` herein), damit dieses Modul
// auch im Mobile-Bundle ladbar bleibt.

import type { AppDefinition } from "./app-definition";
import { appDefinitionSchema } from "./schema";

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

/** Injizierte Existenzprüfung für Asset-Pfade (entkoppelt von `node:fs`). */
export interface AssetExistenceCheck {
  /** Verzeichnis, relativ zu dem Asset-Pfade aufgelöst werden (Variantenordner). */
  root: string;
  /** Existenzprüfung für einen absoluten Pfad – der Loader reicht `fs.existsSync`. */
  exists: (absolutePath: string) => boolean;
  /** Pfadauflösung `root` + relativer Pfad – der Loader reicht `path.resolve`. */
  resolve: (root: string, relativePath: string) => string;
}

export interface ValidateAppDefinitionOptions {
  /**
   * Aktiviert die Prüfung, ob die referenzierten Asset-Dateien existieren. Ohne
   * dieses Feld werden Asset-Pfade nur strukturell (nicht-leer) geprüft. Als
   * Objekt injiziert, damit @spotforge/app-config ohne `node:fs` auskommt.
   */
  assets?: AssetExistenceCheck;
}

/** Sammelt alle gesetzten Asset-Pfade mit ihrem Feldnamen. */
function collectAssetPaths(assets: AppDefinition["assets"]): { field: string; path: string }[] {
  const paths = [
    { field: "assets.icon", path: assets.icon },
    { field: "assets.splash", path: assets.splash },
    { field: "assets.logo", path: assets.logo },
  ];
  if (assets.background !== undefined) {
    paths.push({ field: "assets.background", path: assets.background });
  }
  if (assets.cardFrames !== undefined) {
    for (const [rarity, relativePath] of Object.entries(assets.cardFrames)) {
      if (relativePath !== undefined) {
        paths.push({ field: `assets.cardFrames.${rarity}`, path: relativePath });
      }
    }
  }
  return paths;
}

/**
 * Validiert eine (potentiell unvollständige) Eingabe gegen das AppDefinition-
 * Schema. Prüft Pflichtfelder, gültige `CategoryId`s, den Bereich von
 * `minConfidence`, die Guardrail-Konsistenz (primäre Kategorie ∈ `allowed`) und
 * – wenn {@link ValidateAppDefinitionOptions.assets} gesetzt ist – die Existenz
 * der referenzierten Asset-Dateien. Sammelt **alle** Probleme, statt beim ersten
 * abzubrechen.
 */
export function validateAppDefinition(
  input: unknown,
  options: ValidateAppDefinitionOptions = {},
): ValidationResult {
  const parsed = appDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
      message: issue.message,
    }));
    return { valid: false, issues };
  }

  const definition = parsed.data;

  if (options.assets !== undefined) {
    const { root, exists, resolve } = options.assets;
    const missing: AppDefinitionIssue[] = [];
    for (const { field, path } of collectAssetPaths(definition.assets)) {
      const absolute = resolve(root, path);
      if (!exists(absolute)) {
        missing.push({
          path: field,
          message: `Asset-Datei nicht gefunden: ${path} (erwartet unter ${absolute})`,
        });
      }
    }
    if (missing.length > 0) {
      return { valid: false, issues: missing };
    }
  }

  return { valid: true, definition };
}

/**
 * Fehler einer fehlgeschlagenen AppDefinition-Validierung. Die Meldung listet
 * alle Einzelprobleme auf; das strukturierte {@link AppDefinitionError.issues}-
 * Array steht für programmatische Auswertung bereit.
 */
export class AppDefinitionError extends Error {
  readonly issues: AppDefinitionIssue[];

  constructor(issues: AppDefinitionIssue[], context?: string) {
    const subject = context ? `AppDefinition '${context}'` : "AppDefinition";
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
export function assertAppDefinition(
  input: unknown,
  options: ValidateAppDefinitionOptions = {},
): AppDefinition {
  const result = validateAppDefinition(input, options);
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
