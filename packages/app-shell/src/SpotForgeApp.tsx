import type { AppDefinition, LocaleCode, ThemeTokens } from "@spotforge/app-config";
import { DEFAULT_LOCALE } from "@spotforge/app-config";
import type { CascadeClassifier } from "@spotforge/ai-engine";
import type { AttributeDefinition } from "@spotforge/game-core";
import { ThemeProvider, type ResolvedCardFrames } from "@spotforge/ui";
import { SafeAreaView, StyleSheet } from "react-native";
import { SpotScreen } from "./screens/SpotScreen";

/** Default-Entdecker-Tag, solange es keine Accounts gibt (Auth folgt in den MVP-Issues). */
export const DEFAULT_SPOTTER = "local";

export interface SpotForgeAppProps {
  /** Die zur Build-Variante gehörende (funktionale) Definition (Identität, Kategorie, Texte …). */
  definition: AppDefinition;
  /**
   * Aufgelöste Theme-Tokens der Variante (Branding, ADR 0011). Der Host löst das
   * Branding (Basis ⊕ Variante) auf und reicht das Theme herein; die generische
   * App stellt es per {@link ThemeProvider} dem @spotforge/ui-Design-System bereit.
   */
  theme: ThemeTokens;
  /**
   * Vollständige, vom Host aufgelöste Seltenheits-Frame-Map (generische Defaults ⊕
   * Varianten-Overrides) für das Kartenrendering (ADR 0011).
   */
  frames: ResolvedCardFrames;
  /**
   * Attribut-Schema der App-Kategorie (Source of Truth: `data/categories/<id>.json`).
   * Treibt die Draft-Bearbeitung und die Karten-Stats; kategorie-neutral injiziert.
   */
  attributes: AttributeDefinition[];
  /** Bevorzugte Anzeige-Sprache; Default: {@link DEFAULT_LOCALE}. */
  locale?: LocaleCode;
  /** Entdecker-Tag der erzeugten Drafts; Default: {@link DEFAULT_SPOTTER}. */
  spottedBy?: string;
  /**
   * Zwei-Stufen-Kaskade (Gate → Feinmodell, #8/#50). Vom App-Host injiziert, sobald
   * die gebündelten Modelle geladen sind. Solange `undefined`, zeigt der Spot-Screen
   * einen Lade-/Bereitschaftshinweis statt eines Spot-Ergebnisses.
   */
  cascade?: CascadeClassifier;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte
 * stammen aus der übergebenen {@link AppDefinition} bzw. dem Theme; nichts ist
 * kategorie-spezifisch fest kodiert.
 *
 * Zeigt genau einen Screen – die Spot-Screen-Shell – und startet direkt dort,
 * ohne Login/Onboarding. Spotten erzeugt **offline** einen **Draft** (ADR 0010);
 * das Forgen ist der Online-Schritt und folgt separat. Navigation, FTUE und die
 * übrigen Flows kommen in den weiteren MVP-Issues.
 */
export function SpotForgeApp({
  definition,
  theme,
  frames,
  attributes,
  locale = DEFAULT_LOCALE,
  spottedBy = DEFAULT_SPOTTER,
  cascade,
}: SpotForgeAppProps) {
  return (
    <ThemeProvider theme={theme}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <SpotScreen
          definition={definition}
          attributes={attributes}
          frames={frames}
          locale={locale}
          spottedBy={spottedBy}
          cascade={cascade}
        />
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
