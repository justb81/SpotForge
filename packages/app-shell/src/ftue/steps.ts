// First-Time-User-Experience als reine Zustandsmaschine (GDD §11.1). Die Sequenz
// führt einmalig durch den Core Loop: Willkommen → erster Spot → Schmieden →
// Duell → Tausch → Starter-Karten. Logik hier ist UI-frei und testbar; die
// Darstellung (Slides/Animation) lebt in `FtueFlow.tsx`.

/** Schritte der FTUE in fester Reihenfolge (GDD §11.1). */
export const FTUE_STEPS = ["welcome", "spot", "forge", "battle", "trade", "gift"] as const;

export type FtueStep = (typeof FTUE_STEPS)[number];

/** Erster Schritt der Sequenz. */
export const FIRST_FTUE_STEP: FtueStep = FTUE_STEPS[0];

/** Index eines Schritts (−1, falls unbekannt). */
export function ftueStepIndex(step: FtueStep): number {
  return FTUE_STEPS.indexOf(step);
}

export function isFirstFtueStep(step: FtueStep): boolean {
  return ftueStepIndex(step) === 0;
}

export function isLastFtueStep(step: FtueStep): boolean {
  return ftueStepIndex(step) === FTUE_STEPS.length - 1;
}

/** Nächster Schritt oder `null` am Ende (→ FTUE abgeschlossen). */
export function nextFtueStep(step: FtueStep): FtueStep | null {
  const index = ftueStepIndex(step);
  return index >= 0 && index < FTUE_STEPS.length - 1 ? (FTUE_STEPS[index + 1] ?? null) : null;
}

/** Vorheriger Schritt oder `null` am Anfang. */
export function prevFtueStep(step: FtueStep): FtueStep | null {
  const index = ftueStepIndex(step);
  return index > 0 ? (FTUE_STEPS[index - 1] ?? null) : null;
}

/** Fortschritt 0..1 für die Schritt-Anzeige (Punkte/Balken). */
export function ftueProgress(step: FtueStep): number {
  return (ftueStepIndex(step) + 1) / FTUE_STEPS.length;
}

/** i18n-Schlüssel der Texte eines Schritts (aufgelöst über den TextResolver). */
export interface FtueStepContent {
  titleKey: string;
  bodyKey: string;
}

export const FTUE_STEP_CONTENT: Record<FtueStep, FtueStepContent> = {
  welcome: { titleKey: "ftue.welcome.title", bodyKey: "ftue.welcome.body" },
  spot: { titleKey: "ftue.spot.title", bodyKey: "ftue.spot.body" },
  forge: { titleKey: "ftue.forge.title", bodyKey: "ftue.forge.body" },
  battle: { titleKey: "ftue.battle.title", bodyKey: "ftue.battle.body" },
  trade: { titleKey: "ftue.trade.title", bodyKey: "ftue.trade.body" },
  gift: { titleKey: "ftue.gift.title", bodyKey: "ftue.gift.body" },
};
