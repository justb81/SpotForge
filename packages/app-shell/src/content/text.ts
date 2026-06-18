// Text-Auflösung: vereint die gemeinsamen {@link DEFAULT_CONTENT}-Defaults mit den
// `content`-Overrides einer Variante und löst in die aktive Sprache auf. Das ist
// die **einzige** Stelle, an der die app-shell Texte gewinnt – Komponenten rufen
// nur noch `t(key)` und bleiben so kategorie-neutral.

import { useMemo } from "react";
import type { AppDefinition, ContentOverrides, LocaleCode } from "@spotforge/app-config";
import { DEFAULT_LOCALE, resolveText } from "@spotforge/app-config";
import { DEFAULT_CONTENT } from "./defaults";

/** Löst einen i18n-Schlüssel in einen anzeigefertigen String auf. */
export type TextResolver = (key: string, vars?: Record<string, string | number>) => string;

/** Ersetzt `{name}`-Platzhalter im aufgelösten Text durch übergebene Werte. */
function interpolate(value: string, vars?: Record<string, string | number>): string {
  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

/**
 * Baut einen {@link TextResolver}: Override (Variante) ▸ Default (app-shell) ▸ als
 * letzte Rückfalllinie der Schlüssel selbst (macht einen vergessenen Default im
 * UI sichtbar, statt leer zu rendern).
 */
export function createTextResolver(
  overrides: ContentOverrides,
  locale: LocaleCode = DEFAULT_LOCALE,
): TextResolver {
  return (key, vars) => {
    const entry = overrides[key] ?? DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT];
    return interpolate(entry ? resolveText(entry, locale) : key, vars);
  };
}

/**
 * Hook-Variante für Screens: memoisierter {@link TextResolver} aus der aktiven
 * Definition und Sprache.
 */
export function useText(
  definition: AppDefinition,
  locale: LocaleCode = DEFAULT_LOCALE,
): TextResolver {
  return useMemo(
    () => createTextResolver(definition.content, locale),
    [definition.content, locale],
  );
}
