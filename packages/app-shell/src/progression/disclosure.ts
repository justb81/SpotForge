// Progressive Disclosure (GDD §11.2): nicht alles auf einmal. Der Kern-Loop
// (Spotten) ist sofort da; Sammlung/Duell/Tausch/Profil nach der FTUE; Spezial-
// Mechaniken (Fusion, Marktplatz, Clans) stufenweise mit Level-Ups. Reine Logik –
// keine UI, keine I/O; testbar und sowohl von Navigation als auch Screens genutzt.

/** Alle freischaltbaren Features. Tabs bilden eine Teilmenge davon ab. */
export const FEATURES = [
  "spot",
  "collection",
  "battle",
  "trade",
  "profile",
  "fusion",
  "market",
  "clans",
] as const;

export type Feature = (typeof FEATURES)[number];

/** Minimaler Spielfortschritt, aus dem sich Freischaltungen ableiten. */
export interface PlayerProgress {
  /** Aktuelles Level (0 = brandneu, vor der ersten FTUE). */
  level: number;
  /** Ob die First-Time-User-Experience abgeschlossen wurde. */
  ftueCompleted: boolean;
}

/** Ausgangszustand eines neuen Spielers (FTUE offen). */
export const NEW_PLAYER: PlayerProgress = { level: 0, ftueCompleted: false };

/** Bedingung, unter der ein Feature sichtbar wird. */
interface UnlockRule {
  /** Erst nach abgeschlossener FTUE. */
  ftue?: boolean;
  /** Erst ab diesem Level (inklusive). */
  minLevel?: number;
}

// Quelle der Wahrheit der Freischaltungen. Bewusst datengetrieben, damit weitere
// Features ohne Logikänderung dazukommen.
const RULES: Record<Feature, UnlockRule> = {
  spot: {}, // Einstieg in den Kern-Loop – immer verfügbar.
  collection: { ftue: true },
  battle: { ftue: true },
  trade: { ftue: true },
  profile: { ftue: true },
  fusion: { minLevel: 3 },
  market: { minLevel: 5 },
  clans: { minLevel: 8 },
};

/** Ist `feature` für den gegebenen Fortschritt freigeschaltet? */
export function isFeatureUnlocked(feature: Feature, progress: PlayerProgress): boolean {
  const rule = RULES[feature];
  if (rule.ftue && !progress.ftueCompleted) return false;
  if (rule.minLevel !== undefined && progress.level < rule.minLevel) return false;
  return true;
}

/** Alle aktuell freigeschalteten Features (Reihenfolge wie {@link FEATURES}). */
export function unlockedFeatures(progress: PlayerProgress): Feature[] {
  return FEATURES.filter((feature) => isFeatureUnlocked(feature, progress));
}

/** Level, ab dem `feature` freischaltet (0, wenn nicht level-gebunden). */
export function featureUnlockLevel(feature: Feature): number {
  return RULES[feature].minLevel ?? 0;
}
