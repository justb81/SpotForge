// Build-Zeit-Loader: löst `APP_VARIANT` → `variants/<name>/app.definition` auf,
// lädt das Modul und validiert es (inkl. Existenz der Asset-Dateien). Node-only
// (`node:`-Importe) – NICHT vom RN-tauglichen Paket-Einstieg (`.`) re-exportiert,
// sondern ausschließlich über den Subpfad `@spotforge/app-config/loader`.

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { AppDefinition } from "./app-definition";
import { resolveBranding, type Branding, type BrandingInput } from "./branding";
import { AppDefinitionError, validateAppDefinition, validateBranding } from "./validate";

const moduleDir = dirname(fileURLToPath(import.meta.url)); // packages/app-config/src

/** Standard-Wurzel der Varianten: `<repo>/variants`. */
export const DEFAULT_VARIANTS_DIR = resolve(moduleDir, "../../../variants");

/** Name der Basis-Variante, die die generischen Branding-Defaults liefert (ADR 0011). */
export const BASE_VARIANT_DIR = "_default";

/** Erlaubte Variantennamen – verhindert Pfad-Traversal und uneindeutige Namen. */
const VARIANT_NAME = /^[a-z0-9][a-z0-9-]*$/;

export interface ResolveVariantOptions {
  /** Überschreibt die Varianten-Wurzel (Default: {@link DEFAULT_VARIANTS_DIR}). */
  variantsDir?: string;
}

export interface ResolvedVariant {
  /** Variantenname (= Verzeichnisname unter `variants/`). */
  name: string;
  /** Absolutes Variantenverzeichnis. */
  dir: string;
  /** Absoluter Pfad zur `app.definition.ts`. */
  definitionPath: string;
}

export interface LoadedVariant extends ResolvedVariant {
  /** Die validierte (funktionale) Definition der Variante. */
  definition: AppDefinition;
  /** Das aufgelöste Branding (Basis ⊕ Variante), mit absoluten Asset-Pfaden. */
  branding: Branding;
}

/**
 * Löst einen Variantennamen zu seinen Pfaden auf und stellt sicher, dass
 * Verzeichnis und `app.definition.ts` existieren. Wirft mit klarer Meldung bei
 * ungültigem Namen oder fehlender Variante.
 */
export function resolveVariant(name: string, options: ResolveVariantOptions = {}): ResolvedVariant {
  if (!VARIANT_NAME.test(name)) {
    throw new Error(
      `Ungültiger Variantenname '${name}': erlaubt sind Kleinbuchstaben, Ziffern und Bindestriche.`,
    );
  }
  const variantsDir = options.variantsDir ?? DEFAULT_VARIANTS_DIR;
  const dir = resolve(variantsDir, name);
  if (!existsSync(dir)) {
    throw new Error(`Variante '${name}' nicht gefunden: Verzeichnis ${dir} existiert nicht.`);
  }
  const definitionPath = resolve(dir, "app.definition.ts");
  if (!existsSync(definitionPath)) {
    throw new Error(
      `Variante '${name}' ist unvollständig: ${definitionPath} fehlt (erwartet app.definition.ts).`,
    );
  }
  return { name, dir, definitionPath };
}

/**
 * Lädt und validiert die Variante `name`. Wirft einen {@link AppDefinitionError}
 * mit klarer Meldung, wenn die Definition unvollständig/ungültig ist oder
 * referenzierte Assets fehlen. Asynchron, da Varianten als ESM-Module geladen
 * werden.
 */
export async function loadVariant(
  name: string,
  options: ResolveVariantOptions = {},
): Promise<LoadedVariant> {
  const resolved = resolveVariant(name, options);
  const definition = extractDefault(await import(pathToFileURL(resolved.definitionPath).href));

  const result = validateAppDefinition(definition);
  if (!result.valid) {
    throw new AppDefinitionError(result.issues, name);
  }

  const branding = await loadBranding(name, resolved.dir, options);
  return { ...resolved, definition: result.definition, branding };
}

/**
 * Lädt das Branding der Variante: `variants/_default/branding.config.ts` als
 * Basis, darüber `variants/<name>/branding.config.ts`. Löst beide gegen ihre
 * Verzeichnisse auf (absolute Asset-Pfade), merged und validiert das Ergebnis
 * (Struktur + Existenz der Dateien).
 */
async function loadBranding(
  name: string,
  variantDir: string,
  options: ResolveVariantOptions,
): Promise<Branding> {
  const variantsDir = options.variantsDir ?? DEFAULT_VARIANTS_DIR;
  const baseDir = resolve(variantsDir, BASE_VARIANT_DIR);

  const base = await loadBrandingModule(baseDir, `Basis-Variante '${BASE_VARIANT_DIR}'`);
  const variant = await loadBrandingModule(variantDir, `Variante '${name}'`);

  const branding = resolveBranding({ base, baseDir, variant, variantDir });

  const result = validateBranding(branding, { exists: existsSync });
  if (!result.valid) {
    throw new AppDefinitionError(result.issues, name, "Branding");
  }
  return result.branding;
}

/** Lädt eine `branding.config.ts` aus einem Verzeichnis (Default-Export). */
async function loadBrandingModule(dir: string, subject: string): Promise<BrandingInput> {
  const path = resolve(dir, "branding.config.ts");
  if (!existsSync(path)) {
    throw new Error(`${subject} ist unvollständig: ${path} fehlt (erwartet branding.config.ts).`);
  }
  return extractDefault(await import(pathToFileURL(path).href)) as BrandingInput;
}

/** Holt den Default-Export aus dem geladenen Modul (Fallback: Modul selbst). */
function extractDefault(moduleExports: unknown): unknown {
  if (moduleExports !== null && typeof moduleExports === "object" && "default" in moduleExports) {
    return (moduleExports as { default: unknown }).default;
  }
  return moduleExports;
}
