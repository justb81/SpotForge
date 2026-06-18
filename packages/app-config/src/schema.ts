// Laufzeit-Schema (zod) für eine {@link AppDefinition}. Spiegelt das in
// `app-definition.ts` deklarierte Interface – ein Compile-Zeit-Wächter am Ende
// stellt sicher, dass beide nicht auseinanderdriften. Reines, RN-taugliches JS
// (kein `node:`-Import); die Datei-Existenzprüfung der Assets lebt im Loader.

import { z } from "zod";
import { CATEGORY_IDS } from "@spotforge/game-core";
import type { AppDefinition } from "./app-definition";
import type { Branding } from "./branding";

/** Pflicht-String mit aussagekräftiger Meldung. */
const nonEmpty = (feld: string) => z.string().min(1, `${feld} darf nicht leer sein`);

/** Hex-Farbe: #RGB, #RRGGBB oder #RRGGBBAA. */
const hexColor = (feld: string) =>
  z
    .string()
    .regex(
      /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
      `${feld} muss eine Hex-Farbe sein (z.B. #E10600)`,
    );

/** Gültige Kategorie-ID – Quelle der Wahrheit ist game-core (CATEGORY_IDS). */
const categoryIdSchema = z.enum(CATEGORY_IDS);

/** Mehrsprachiger Text: für jede unterstützte Sprache genau eine Übersetzung. */
const localizedTextSchema = z.object({
  de: nonEmpty("de"),
  en: nonEmpty("en"),
});

const guardrailsSchema = z.object({
  allowed: z
    .array(categoryIdSchema)
    .min(1, "guardrails.allowed muss mindestens eine Kategorie enthalten"),
  minConfidence: z
    .number()
    .min(0, "guardrails.minConfidence muss ≥ 0 sein")
    .max(1, "guardrails.minConfidence muss ≤ 1 sein"),
  rejectMessage: localizedTextSchema,
});

const gateSchema = z.object({
  allow: z
    .array(nonEmpty("gate.allow[]"))
    .min(1, "category.gate.allow muss mindestens ein Label enthalten"),
});

const aiPromptsSchema = z.object({
  classificationHint: z.string().min(1).optional(),
  cardArtPrompt: nonEmpty("ai.cardArtPrompt"),
  factPrompt: nonEmpty("ai.factPrompt"),
});

/** Optionale Feature-Schalter; jeder Schalter ist optional (Default: aus). */
const featuresSchema = z
  .object({
    imageImport: z.boolean().optional(),
  })
  .optional();

const themeTokensSchema = z.object({
  colors: z.object({
    primary: hexColor("theme.colors.primary"),
    secondary: hexColor("theme.colors.secondary"),
    background: hexColor("theme.colors.background"),
    surface: hexColor("theme.colors.surface"),
    text: hexColor("theme.colors.text"),
    accent: hexColor("theme.colors.accent"),
  }),
  typography: z.object({
    fontFamily: nonEmpty("theme.typography.fontFamily"),
    headingFontFamily: z.string().min(1).optional(),
  }),
  radius: z.number().nonnegative("theme.radius darf nicht negativ sein").optional(),
});

const assetManifestSchema = z.object({
  icon: nonEmpty("assets.icon"),
  splash: nonEmpty("assets.splash"),
  logo: nonEmpty("assets.logo"),
  background: z.string().min(1).optional(),
});

const identitySchema = z.object({
  displayName: nonEmpty("identity.displayName"),
  slug: nonEmpty("identity.slug"),
  scheme: nonEmpty("identity.scheme"),
  ios: z.object({ bundleIdentifier: nonEmpty("identity.ios.bundleIdentifier") }),
  android: z.object({ package: nonEmpty("identity.android.package") }),
});

/** Text-Overrides: i18n-Schlüssel → mehrsprachiger Text. */
const contentOverridesSchema = z.record(z.string(), localizedTextSchema);

/**
 * Vollständiges Schema einer {@link AppDefinition}. Neben der Struktur prüft es
 * die Guardrail-Konsistenz: die primäre Kategorie muss in `allowed` enthalten
 * sein. Die Existenz der Asset-Dateien wird hier **nicht** geprüft (kein I/O) –
 * das übernimmt der Loader bzw. {@link validateAppDefinition} mit injizierter
 * Existenzprüfung.
 */
export const appDefinitionSchema = z
  .object({
    id: nonEmpty("id"),
    identity: identitySchema,
    category: z.object({
      primary: categoryIdSchema,
      guardrails: guardrailsSchema,
      gate: gateSchema,
    }),
    ai: aiPromptsSchema,
    content: contentOverridesSchema,
    features: featuresSchema,
  })
  .refine((def) => def.category.guardrails.allowed.includes(def.category.primary), {
    message: "category.guardrails.allowed muss die primäre Kategorie (category.primary) enthalten",
    path: ["category", "guardrails", "allowed"],
  });

// --- Compile-Zeit-Wächter (geprüft via `pnpm typecheck`) ---------------------
// Was das Schema ausgibt, muss ein gültiges AppDefinition sein. Driftet das
// Schema vom Interface in `app-definition.ts` ab, schlägt der Typecheck hier
// fehl (statt erst zur Laufzeit). Bewusst nicht exportiert.
type Expect<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type _SchemaOutputIsAppDefinition = Expect<
  IsAssignable<z.infer<typeof appDefinitionSchema>, AppDefinition>
>;

/**
 * Schema des **aufgelösten** {@link Branding} (Theme + Assets), wie es
 * {@link resolveBranding} liefert. Prüft die strukturelle Vollständigkeit
 * (alle Theme-Farben, Pflicht-Assets icon/splash/logo); die Existenz der
 * Asset-Dateien prüft `validateBranding` mit injizierter Prüfung.
 */
export const brandingSchema = z.object({
  theme: themeTokensSchema,
  assets: assetManifestSchema,
});

type _BrandingSchemaOutputIsBranding = Expect<
  IsAssignable<z.infer<typeof brandingSchema>, Branding>
>;
