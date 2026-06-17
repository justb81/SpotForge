import { useCallback, useState } from "react";
import type { AppDefinition, LocaleCode, ThemeTokens } from "@spotforge/app-config";
import { DEFAULT_LOCALE } from "@spotforge/app-config";
import type { CascadeClassifier } from "@spotforge/ai-engine";
import type { AttributeDefinition } from "@spotforge/game-core";
import { ThemeProvider, type ResolvedCardFrames } from "@spotforge/ui";
import { SafeAreaView, StyleSheet } from "react-native";
import { useText } from "./content/text";
import { AppNavigator } from "./navigation/AppNavigator";
import { FtueFlow } from "./ftue/FtueFlow";
import { NEW_PLAYER, type PlayerProgress } from "./progression/disclosure";

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
  /**
   * Anfänglicher Spielfortschritt – steuert FTUE und Progressive Disclosure. Der
   * Host kann hier einen persistierten Stand einreichen; Default ist ein neuer
   * Spieler ({@link NEW_PLAYER}, FTUE offen).
   */
  initialProgress?: PlayerProgress;
  /**
   * Wird aufgerufen, wenn sich der Fortschritt ändert (z.B. FTUE abgeschlossen),
   * damit der Host ihn persistieren kann. app-shell bleibt bewusst I/O-frei.
   */
  onProgressChange?: (progress: PlayerProgress) => void;
}

/**
 * Generischer App-Einstieg. Kategorie-agnostisch: alle sichtbaren Inhalte stammen
 * aus der übergebenen {@link AppDefinition} bzw. dem Theme; nichts ist kategorie-
 * spezifisch fest kodiert.
 *
 * Steuert den obersten Ablauf: ein neuer Spieler durchläuft zunächst die
 * **First-Time-User-Experience** (GDD §11.1); danach übernimmt der
 * {@link AppNavigator} mit der Tab-Navigation (Spot, Sammlung, Duell, Tausch,
 * Profil), deren Sichtbarkeit die Progressive Disclosure (GDD §11.2) regelt.
 */
export function SpotForgeApp({
  definition,
  theme,
  frames,
  attributes,
  locale = DEFAULT_LOCALE,
  spottedBy = DEFAULT_SPOTTER,
  cascade,
  initialProgress = NEW_PLAYER,
  onProgressChange,
}: SpotForgeAppProps) {
  const [progress, setProgress] = useState<PlayerProgress>(initialProgress);
  const t = useText(definition, locale);

  const updateProgress = useCallback(
    (next: PlayerProgress) => {
      setProgress(next);
      onProgressChange?.(next);
    },
    [onProgressChange],
  );

  // FTUE abschließen: als gespielt markieren und auf mindestens Level 1 heben,
  // damit die Basis-Bereiche freigeschaltet werden (Progressive Disclosure).
  const completeFtue = useCallback(() => {
    updateProgress({ ftueCompleted: true, level: Math.max(progress.level, 1) });
  }, [progress.level, updateProgress]);

  return (
    <ThemeProvider theme={theme}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
        {progress.ftueCompleted ? (
          <AppNavigator
            definition={definition}
            attributes={attributes}
            frames={frames}
            locale={locale}
            spottedBy={spottedBy}
            cascade={cascade}
            progress={progress}
            t={t}
          />
        ) : (
          <FtueFlow t={t} onComplete={completeFtue} />
        )}
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
