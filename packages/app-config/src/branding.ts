// Branding einer App: **Theme + Assets** (Icon/Splash/Logo/Hintergrund), bewusst
// aus der {@link AppDefinition} herausgelöst (ADR 0011). Die Seltenheits-Karten-
// rahmen sind **keine** Assets mehr, sondern werden prozedural gerendert (#96, ADR
// 0015). Jede Variante liefert nur ihre Abweichungen; die
// Basis-Variante `variants/_default` stellt die generischen Defaults bereit.
// {@link resolveBranding} legt die Variante über die Basis (Theme tief, Assets
// pro Feld) und liefert ein vollständiges, aufgelöstes Branding.
//
// Reine Werte-/String-Logik (kein `node:`-Import) → RN-tauglich und testbar.

/** Visuelle Theme-Tokens (Konsum: @spotforge/ui ThemeProvider). */
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

export interface AssetManifest {
  icon: string;
  splash: string;
  logo: string;
  background?: string;
}

/** Vollständiges Branding (Theme + Assets) – das aufgelöste Ergebnis. */
export interface Branding {
  theme: ThemeTokens;
  assets: AssetManifest;
}

/** Tiefer Teil-Typ: jede Variante (und die Basis) liefert nur ihre Abweichungen. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Branding-Eingabe einer Variante bzw. der Basis – darf unvollständig sein. */
export type BrandingInput = DeepPartial<Branding>;

/**
 * Identitäts-Helper für `variants/<name>/branding.config.ts` (und
 * `variants/_default`). Gibt die Eingabe unverändert zurück, erzwingt aber die
 * Typprüfung gegen {@link BrandingInput}.
 */
export function defineBranding(branding: BrandingInput): BrandingInput {
  return branding;
}

/** Verbindet ein Verzeichnis-Präfix mit einem (relativen) Asset-Pfad. */
function joinAsset(dir: string, relativePath: string): string {
  return `${dir.replace(/\/+$/, "")}/${relativePath.replace(/^\.?\/+/, "")}`;
}

/** Eingabe der Branding-Auflösung: Basis + Variante samt ihrer Verzeichnis-Präfixe. */
export interface ResolveBrandingInput {
  /** Branding der Basis-Variante (`variants/_default`). */
  base: BrandingInput;
  /** Präfix, mit dem Basis-Asset-Pfade verbunden werden (z.B. `variants/_default`). */
  baseDir: string;
  /** Branding der konkreten Variante. */
  variant: BrandingInput;
  /** Präfix, mit dem Varianten-Asset-Pfade verbunden werden (z.B. `variants/cars`). */
  variantDir: string;
}

function mergeTheme(
  base?: DeepPartial<ThemeTokens>,
  override?: DeepPartial<ThemeTokens>,
): ThemeTokens {
  const theme = {
    colors: { ...base?.colors, ...override?.colors },
    typography: { ...base?.typography, ...override?.typography },
    ...((override?.radius ?? base?.radius) !== undefined
      ? { radius: override?.radius ?? base?.radius }
      : {}),
  };
  return theme as ThemeTokens;
}

/** Wählt pro Asset-Feld die Variante (falls gesetzt), sonst die Basis – und löst den Pfad gegen das jeweilige Verzeichnis auf. */
function pickAsset(
  field: "icon" | "splash" | "logo" | "background",
  input: ResolveBrandingInput,
): string | undefined {
  const variantValue = input.variant.assets?.[field];
  if (variantValue !== undefined) return joinAsset(input.variantDir, variantValue);
  const baseValue = input.base.assets?.[field];
  if (baseValue !== undefined) return joinAsset(input.baseDir, baseValue);
  return undefined;
}

/**
 * Löst das Branding einer Variante auf: Theme der Variante über das Theme der
 * Basis (tief gemergt), Assets pro Feld (Variante gewinnt, sonst Basis), jeweils
 * mit dem korrekten Verzeichnis-Präfix verbunden. Pflichtfelder, die weder
 * Variante noch Basis liefern, bleiben `undefined` und werden von
 * {@link validateBranding} als fehlend gemeldet.
 */
export function resolveBranding(input: ResolveBrandingInput): Branding {
  const background = pickAsset("background", input);
  return {
    theme: mergeTheme(input.base.theme, input.variant.theme),
    assets: {
      icon: pickAsset("icon", input) as string,
      splash: pickAsset("splash", input) as string,
      logo: pickAsset("logo", input) as string,
      ...(background !== undefined ? { background } : {}),
    },
  };
}
